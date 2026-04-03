import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/\+/g, "%20")
    .replace(/\*/g, "%2A")
    .replace(/%7E/g, "~");
}

function generateSignature(params: Record<string, string>, sk: string, method: string): string {
  const sortedKeys = Object.keys(params).sort();
  const canonicalizedQuery = sortedKeys
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join("&");

  const stringToSign = `${method}&${percentEncode("/")}&${percentEncode(canonicalizedQuery)}`;
  const hmac = crypto.createHmac("sha1", sk + "&");
  hmac.update(stringToSign);
  return hmac.digest("base64");
}

async function getToken(ak: string, sk: string): Promise<string> {
  const params: Record<string, string> = {
    AccessKeyId: ak,
    Action: "CreateToken",
    Version: "2019-02-28",
    Format: "JSON",
    RegionId: "cn-shanghai",
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    SignatureMethod: "HMAC-SHA1",
    SignatureVersion: "1.0",
    SignatureNonce: crypto.randomUUID(),
  };

  params.Signature = generateSignature(params, sk, "POST");

  const body = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const response = await fetch("https://nls-meta.cn-shanghai.aliyuncs.com/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const result = await response.json();

  if (!response.ok || !result.Token?.Id) {
    throw new Error(
      `Token error: ${result.Message || result.ErrMsg || JSON.stringify(result)}`
    );
  }

  return result.Token.Id;
}

export async function POST(request: NextRequest) {
  try {
    const ak = process.env.ALIYUN_AK;
    const sk = process.env.ALIYUN_SK;
    const appkey = process.env.ALIYUN_APPKEY;

    if (!ak || !sk || !appkey) {
      return NextResponse.json(
        { error: "环境变量未配置：ALIYUN_AK, ALIYUN_SK, ALIYUN_APPKEY" },
        { status: 500 }
      );
    }

    const audioBuffer = await request.arrayBuffer();
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: "未收到音频数据" },
        { status: 400 }
      );
    }

    let token: string;
    try {
      token = await getToken(ak, sk);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Token error:", msg);
      return NextResponse.json({ error: `Token获取失败: ${msg}` }, { status: 500 });
    }

    const asrUrl = `https://nls-gateway-cn-shanghai.aliyuncs.com/stream/v1/asr?appkey=${appkey}&format=wav&sample_rate=16000&enable_punctuation_prediction=true&enable_inverse_text_normalization=true`;

    const asrResponse = await fetch(asrUrl, {
      method: "POST",
      headers: {
        "X-NLS-Token": token,
        "Content-Type": "application/octet-stream",
      },
      body: audioBuffer,
    });

    const result = await asrResponse.json();

    if (result.status === 20000000) {
      return NextResponse.json({ text: result.result || "" });
    } else {
      console.error("ASR error:", result);
      return NextResponse.json(
        { error: `语音识别错误(${result.status}): ${result.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Speech recognition error:", msg);
    return NextResponse.json(
      { error: `语音识别失败: ${msg}` },
      { status: 500 }
    );
  }
}

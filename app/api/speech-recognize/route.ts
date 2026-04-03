import { NextRequest, NextResponse } from "next/server";
import Core from "@alicloud/pop-core";

async function getToken(ak: string, sk: string): Promise<string> {
  const client = new Core({
    accessKeyId: ak,
    accessKeySecret: sk,
    endpoint: "https://nls-meta.cn-shanghai.aliyuncs.com",
    apiVersion: "2019-02-28",
  });

  const response = (await client.request("CreateToken", {}, { method: "POST" })) as {
    Token?: { Id?: string };
  };

  const token = response.Token?.Id;
  if (!token) throw new Error("Failed to obtain token");
  return token;
}

export async function POST(request: NextRequest) {
  try {
    const ak = process.env.ALIYUN_AK;
    const sk = process.env.ALIYUN_SK;
    const appkey = process.env.ALIYUN_APPKEY;

    if (!ak || !sk || !appkey) {
      return NextResponse.json(
        { error: "Missing Aliyun credentials" },
        { status: 500 }
      );
    }

    const audioBuffer = await request.arrayBuffer();
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: "No audio data received" },
        { status: 400 }
      );
    }

    const token = await getToken(ak, sk);

    const asrUrl = `https://nls-gateway-cn-shanghai.aliyuncs.com/stream/v1/asr?appkey=${appkey}&format=wav&sample_rate=16000&enable_punctuation_prediction=true&enable_inverse_text_normalization=true`;

    const asrResponse = await fetch(asrUrl, {
      method: "POST",
      headers: {
        "X-NLS-Token": token,
        "Content-Type": "application/octet-stream",
        "Content-Length": String(audioBuffer.byteLength),
      },
      body: audioBuffer,
    });

    const result = await asrResponse.json();

    if (result.status === 20000000) {
      return NextResponse.json({ text: result.result || "" });
    } else {
      console.error("ASR error:", result);
      return NextResponse.json(
        { error: result.message || "Recognition failed" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Speech recognition error:", error);
    return NextResponse.json(
      { error: "Speech recognition failed" },
      { status: 500 }
    );
  }
}

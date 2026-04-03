import { NextRequest, NextResponse } from 'next/server';
import Core from '@alicloud/pop-core';

export async function POST(request: NextRequest) {
  try {
    const ak = process.env.ALIYUN_AK;
    const sk = process.env.ALIYUN_SK;
    const appkey = process.env.ALIYUN_APPKEY;

    if (!ak || !sk || !appkey) {
      return NextResponse.json(
        { error: 'Missing Aliyun credentials in environment variables' },
        { status: 500 }
      );
    }

    const client = new Core({
      accessKeyId: ak,
      accessKeySecret: sk,
      endpoint: 'https://nls-meta.cn-shanghai.aliyuncs.com',
      apiVersion: '2019-02-28',
    });

    const params = {};
    const requestOption = {
      method: 'POST',
    };

    const response = await client.request('CreateToken', params, requestOption) as {
      Token?: { Id?: string };
    };

    return NextResponse.json({
      token: response.Token?.Id,
      appkey: appkey,
    });
  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}

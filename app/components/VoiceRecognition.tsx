'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Mic } from 'lucide-react';

function encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}

export function VoiceRecognition({
  onResult,
}: {
  onResult?: (text: string) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultText, setResultText] = useState('');
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    if (isProcessing) return;
    setError('');
    setResultText('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsProcessing(true);

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioContext = new AudioContext({ sampleRate: 16000 });
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const channelData = audioBuffer.getChannelData(0);
          const wavBuffer = encodeWAV(channelData, 16000);

          const response = await fetch('/api/speech-recognize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: wavBuffer,
          });

          const result = await response.json();
          if (result.error) {
            setError(result.error);
          } else if (result.text?.trim()) {
            setResultText(result.text.trim());
            onResult?.(result.text.trim());
          } else {
            setError('未识别到语音内容，请重试');
          }
        } catch {
          setError('语音识别失败，请重试');
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      setError('无法启动录音，请检查麦克风权限');
    }
  }, [isProcessing, onResult]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-md">
        <Button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={(e) => {
            e.preventDefault();
            startRecording();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            stopRecording();
          }}
          disabled={isProcessing}
          className="w-full h-16 text-lg font-semibold select-none"
          variant={isRecording ? 'destructive' : 'default'}
        >
          <Mic className="h-5 w-5 mr-2" />
          {isRecording ? '正在聆听...' : '按住说话'}
        </Button>
      </div>

      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>识别中...</span>
        </div>
      )}

      {error && (
        <div className="w-full max-w-md p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {resultText && (
        <div className="w-full max-w-md p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-sm font-semibold text-green-900 mb-2">识别结果：</p>
          <p className="text-base text-green-800 break-words">{resultText}</p>
        </div>
      )}
    </div>
  );
}

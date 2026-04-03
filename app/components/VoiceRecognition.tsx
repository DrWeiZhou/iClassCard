'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface RecognitionResult {
  text: string;
  confidence?: number;
}

export function VoiceRecognition() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultText, setResultText] = useState('');
  const [error, setError] = useState('');
  const recognizerRef = useRef<any>(null);
  const tokenRef = useRef<string>('');
  const appkeyRef = useRef<string>('');

  useEffect(() => {
    // Load SDK dynamically
    const script = document.createElement('script');
    script.src = 'https://g.alicdn.com/nls/h5-asr/1.6.8/aliyun-nls-js-sdk.min.js';
    script.onload = () => {
      console.log('Aliyun NLS SDK loaded');
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const getToken = async () => {
    try {
      const response = await fetch('/api/get-aliyun-token', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      tokenRef.current = data.token;
      appkeyRef.current = data.appkey;
      return true;
    } catch (err) {
      setError('Failed to get token from server');
      console.error('Token fetch error:', err);
      return false;
    }
  };

  const initializeRecognizer = async () => {
    if (!window.NLS) {
      setError('NLS SDK not loaded');
      return false;
    }

    try {
      const recognizer = new window.NLS.SpeechRecognizer({
        token: tokenRef.current,
        appkey: appkeyRef.current,
        format: 'pcm',
        sampleRate: 16000,
      });

      recognizer.on('completed', (result: RecognitionResult) => {
        setResultText(result.text || '');
        setIsProcessing(false);
        setIsRecording(false);
      });

      recognizer.on('failed', (error: any) => {
        setError(`Recognition failed: ${error.message || 'Unknown error'}`);
        setIsProcessing(false);
        setIsRecording(false);
      });

      recognizer.on('error', (error: any) => {
        setError(`Error: ${error.message || 'Unknown error'}`);
        setIsProcessing(false);
        setIsRecording(false);
      });

      recognizerRef.current = recognizer;
      return true;
    } catch (err) {
      setError('Failed to initialize recognizer');
      console.error('Recognizer init error:', err);
      return false;
    }
  };

  const startRecording = async () => {
    setError('');
    setResultText('');

    const tokenOk = await getToken();
    if (!tokenOk) return;

    const initOk = await initializeRecognizer();
    if (!initOk) return;

    try {
      setIsRecording(true);
      recognizerRef.current.start();
    } catch (err) {
      setError('Failed to start recording');
      setIsRecording(false);
      console.error('Start recording error:', err);
    }
  };

  const stopRecording = () => {
    if (recognizerRef.current && isRecording) {
      try {
        recognizerRef.current.stop();
        setIsRecording(false);
        setIsProcessing(true);
      } catch (err) {
        setError('Failed to stop recording');
        console.error('Stop recording error:', err);
      }
    }
  };

  const handleMouseDown = () => {
    startRecording();
  };

  const handleMouseUp = () => {
    stopRecording();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    startRecording();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    stopRecording();
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-md">
        <Button
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          disabled={isProcessing}
          className="w-full h-16 text-lg font-semibold select-none"
          variant={isRecording ? 'destructive' : 'default'}
        >
          {isRecording ? '正在聆听...' : '按住说话'}
        </Button>
      </div>

      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>处理中...</span>
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

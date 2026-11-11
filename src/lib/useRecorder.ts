import { useCallback, useEffect, useRef, useState } from 'react';

type RecorderSnapshot = {
  recording: boolean;
  url: string | null;
  error: string | null;
  seconds: number;
};

export function useRecorder(maxSeconds = 7) {
  const [state, setState] = useState<RecorderSnapshot>({
    recording: false,
    url: null,
    error: null,
    seconds: 0,
  });

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const urlRef = useRef<string | null>(null);

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stop = useCallback(() => {
    clearTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  }, []);

  const start = useCallback(async () => {
    if (state.recording) {
      stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setState({
        recording: false,
        url: null,
        seconds: 0,
        error: 'Recording is not available in this browser.',
      });
      return;
    }

    setState({ recording: false, url: null, seconds: 0, error: null });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        releaseStream();
        setState({ recording: false, url, error: null, seconds: 0 });
      };

      recorderRef.current = recorder;
      recorder.start();
      setState({ recording: true, url: null, error: null, seconds: 0 });

      let elapsed = 0;
      timerRef.current = window.setInterval(() => {
        elapsed += 1;
        setState((previous) => ({ ...previous, seconds: elapsed }));
        if (elapsed >= maxSeconds) {
          clearTimer();
          if (recorder.state !== 'inactive') recorder.stop();
        }
      }, 1000);
    } catch {
      releaseStream();
      setState({
        recording: false,
        url: null,
        seconds: 0,
        error: 'I could not use the microphone. Ask a grown-up to allow microphone access, then try again.',
      });
    }
  }, [maxSeconds, state.recording, stop]);

  useEffect(() => {
    return () => {
      clearTimer();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return { ...state, start, stop };
}

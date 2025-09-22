import { useState, useCallback } from 'react';

const useSpeechToText = (onTranscription) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const timerRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      audioChunks.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };
      
      mediaRecorder.current.onstop = handleRecordingStop;
      mediaRecorder.current.start();
      
      // Start timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      clearInterval(timerRef.current);
      setIsRecording(false);
    }
  }, []);

  const handleRecordingStop = useCallback(async () => {
    try {
      setIsProcessing(true);
      
      const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
      await sendAudioToServer(audioBlob);
      
    } catch (err) {
      console.error('Error processing recording:', err);
      setError('Failed to process recording. Please try again.');
    } finally {
      setIsProcessing(false);
      audioChunks.current = [];
    }
  }, [onTranscription]);

  const sendAudioToServer = useCallback(async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/speech/transcribe`
        : '/api/speech/transcribe';
        
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header, let the browser set it with the correct boundary
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        throw new Error(errorData.error || 'Failed to transcribe audio');
      }
      
      const data = await response.json();
      if (data.success && data.text) {
        onTranscription(data.text);
        return true;
      } else {
        throw new Error('No transcription returned');
      }
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  }, [onTranscription]);

  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;
    
    try {
      setIsProcessing(true);
      setError(null);
      
      await sendAudioToServer(file);
      return true;
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to process the audio file. Please try again.');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [sendAudioToServer]);

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    isRecording,
    isProcessing,
    error,
    recordingTime,
    startRecording,
    stopRecording,
    handleFileUpload,
    formatTime,
    setError,
  };
};

export default useSpeechToText;

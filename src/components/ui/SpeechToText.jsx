import React, { useRef } from 'react';
import { Button, Box, Typography, CircularProgress, Paper } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import UploadIcon from '@mui/icons-material/Upload';
import useSpeechToText from '../../hooks/useSpeechToText';

const SpeechToText = ({ onTranscription, disabled = false }) => {
  const fileInputRef = useRef(null);
  
  const {
    isRecording,
    isProcessing,
    error,
    recordingTime,
    startRecording,
    stopRecording,
    handleFileUpload,
    formatTime,
    setError,
  } = useSpeechToText(onTranscription);

  const handleFileInputChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const success = await handleFileUpload(file);
    if (success && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 2, width: '100%', maxWidth: 500, mx: 'auto' }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Speech to Text
        </Typography>
        
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2 }}>
          {!isRecording ? (
            <Button
              variant="contained"
              color="primary"
              onClick={startRecording}
              disabled={isProcessing || disabled}
              startIcon={<MicIcon />}
            >
              Start Recording
            </Button>
          ) : (
            <Button
              variant="contained"
              color="secondary"
              onClick={stopRecording}
              disabled={isProcessing}
              startIcon={<StopIcon />}
            >
              Stop Recording
            </Button>
          )}
          
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileInputChange}
            ref={fileInputRef}
            style={{ display: 'none' }}
            id="audio-upload"
            disabled={isProcessing || isRecording || disabled}
          />
          <label htmlFor="audio-upload">
            <Button
              variant="outlined"
              component="span"
              disabled={isProcessing || isRecording || disabled}
              startIcon={<UploadIcon />}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Audio
            </Button>
          </label>
        </Box>
        
        {(isRecording || isProcessing) && (
          <Box sx={{ mt: 2 }}>
            {isRecording && (
              <Typography variant="body2" color="textSecondary">
                Recording: {formatTime(recordingTime)}
              </Typography>
            )}
            {isProcessing && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                <Typography variant="body2">Processing audio...</Typography>
              </Box>
            )}
          </Box>
        )}
        
        <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
          Supports WAV, MP3, M4A, OGG, MP4, and WebM formats (max 10MB)
        </Typography>
      </Box>
    </Paper>
  );
};

export default SpeechToText;

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Hls from 'hls.js';
import { io } from 'socket.io-client';
import api from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, Users, MessageCircle, Send, X, Heart, ThumbsUp, Smile } from 'lucide-react';

const Player = () => {
  const { id } = useParams();
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const socketRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [quality, setQuality] = useState('auto');
  const [viewerCount, setViewerCount] = useState(0);
  const [showChat, setShowChat] = useState(true);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [showReactions, setShowReactions] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const reactionEmojis = ['❤️', '👍', '😂', '😲', '🔥', '🎉'];

  useEffect(() => {
    fetchStreamDetails();
    initializeSocket();
    
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [id]);

  const fetchStreamDetails = async () => {
    try {
      const response = await api.get(`/streams/${id}`);
      setStream(response.data);
      
      // Get playback token
      const tokenResponse = await api.get(`/streams/${id}/playback-token`);
      const token = tokenResponse.data.token;
      
      // Initialize HLS player
      initializePlayer(response.data, token);
    } catch (error) {
      console.error('Error fetching stream:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializePlayer = (streamData, token) => {
    const hlsUrl = `https://cdn.yourplatform.com/hls/${streamData.id}/playlist.m3u8?token=${token}`;
    
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      
      hls.loadSource(hlsUrl);
      hls.attachMedia(videoRef.current);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest loaded, ready to play');
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
      });
      
      hlsRef.current = hls;
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      videoRef.current.src = hlsUrl;
    }
  };

  const initializeSocket = () => {
    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL?.replace('/api', '') || 'http://localhost:8002';
    const socket = io(BACKEND_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });
    
    socket.on('connect', () => {
      console.log('Socket connected');
      socket.emit('join_stream', { stream_id: id });
    });
    
    socket.on('viewer_count_update', (data) => {
      setViewerCount(data.count);
    });
    
    socket.on('chat_message', (data) => {
      setMessages(prev => [...prev, data]);
    });
    
    socket.on('reaction', (data) => {
      addReactionAnimation(data.emoji);
    });
    
    socketRef.current = socket;
  };

  const togglePlay = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    videoRef.current.volume = newVolume / 100;
    setIsMuted(newVolume === 0);
  };

  const toggleFullscreen = () => {
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !socketRef.current) return;
    
    socketRef.current.emit('chat_message', {
      stream_id: id,
      message: messageInput,
      username: 'User' // Replace with actual username from auth
    });
    
    setMessageInput('');
  };

  const sendReaction = (emoji) => {
    if (!socketRef.current) return;
    
    socketRef.current.emit('reaction', {
      stream_id: id,
      emoji: emoji
    });
    
    setShowReactions(false);
  };

  const addReactionAnimation = (emoji) => {
    const id = Date.now() + Math.random();
    const left = Math.random() * 80 + 10; // Random position between 10-90%
    
    setReactions(prev => [...prev, { id, emoji, left }]);
    
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 3000);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Stream Title */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{stream?.title}</h1>
            <p className="text-gray-600">{stream?.description}</p>
          </div>
          <div className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            <span className="font-semibold">LIVE</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Video Player */}
          <div className={showChat ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <div className="bg-black rounded-lg overflow-hidden relative aspect-video group">
              {/* Video Element */}
              <video
                ref={videoRef}
                className="w-full h-full"
                onClick={togglePlay}
              />
              
              {/* Reaction Animations */}
              {reactions.map(reaction => (
                <div
                  key={reaction.id}
                  className="absolute bottom-0 text-4xl animate-float-up pointer-events-none"
                  style={{ left: `${reaction.left}%` }}
                >
                  {reaction.emoji}
                </div>
              ))}
              
              {/* Player Controls */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-4">
                  {/* Play/Pause */}
                  <button
                    onClick={togglePlay}
                    className="text-white hover:text-blue-400 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </button>
                  
                  {/* Volume */}
                  <div className="flex items-center gap-2 group/volume">
                    <button
                      onClick={toggleMute}
                      className="text-white hover:text-blue-400 transition-colors"
                    >
                      {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-20 opacity-0 group-hover/volume:opacity-100 transition-opacity"
                    />
                  </div>
                  
                  {/* Viewer Count */}
                  <div className="flex items-center gap-2 text-white">
                    <Users className="w-5 h-5" />
                    <span className="text-sm font-medium">{viewerCount}</span>
                  </div>
                  
                  <div className="flex-1"></div>
                  
                  {/* Quality Selector */}
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className="bg-black/50 text-white text-sm rounded px-2 py-1 border border-white/20"
                  >
                    <option value="auto">Auto</option>
                    <option value="1080p">1080p</option>
                    <option value="720p">720p</option>
                    <option value="480p">480p</option>
                    <option value="360p">360p</option>
                  </select>
                  
                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="text-white hover:text-blue-400 transition-colors"
                  >
                    <Maximize className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Reaction Bar */}
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => setShowReactions(!showReactions)}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 flex items-center gap-2"
              >
                <Heart className="w-5 h-5" />
                React
              </button>
              
              {showReactions && (
                <div className="flex gap-2 animate-fade-in">
                  {reactionEmojis.map((emoji, index) => (
                    <button
                      key={index}
                      onClick={() => sendReaction(emoji)}
                      className="text-3xl hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Chat Panel */}
          {showChat && (
            <div className="bg-white rounded-lg border border-gray-200 flex flex-col h-[600px]">
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-gray-700" />
                  <h3 className="font-semibold text-gray-900">Live Chat</h3>
                </div>
                <button
                  onClick={() => setShowChat(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No messages yet. Be the first to chat!</p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                        {msg.username?.[0] || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold text-sm text-gray-900">{msg.username}</span>
                          <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-sm text-gray-700">{msg.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Message Input */}
              <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Send a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {/* Toggle Chat Button (when hidden) */}
          {!showChat && (
            <button
              onClick={() => setShowChat(true)}
              className="fixed bottom-8 right-8 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 z-50"
            >
              <MessageCircle className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
      
      {/* Custom Animation Styles */}
      <style jsx>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-500px) scale(1.5);
            opacity: 0;
          }
        }
        
        .animate-float-up {
          animation: float-up 3s ease-out forwards;
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </DashboardLayout>
  );
};

export default Player;
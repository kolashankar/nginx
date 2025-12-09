import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Send, Users } from 'lucide-react';
import { toast } from 'sonner';
import io from 'socket.io-client';

const ChatWidget = ({ streamId, appId }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const username = localStorage.getItem('username') || 'Anonymous';

  useEffect(() => {
    // Connect to Socket.IO server
    const socket = io(process.env.REACT_APP_REALTIME_URL || 'http://localhost:8002', {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to chat server');
      setConnected(true);
      // Join stream room
      socket.emit('join_stream', { streamId, appId });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      setConnected(false);
    });

    socket.on('chat_message', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now() + Math.random(),
        username: data.username,
        message: data.message,
        timestamp: new Date(data.timestamp)
      }]);
    });

    socket.on('user_count', (count) => {
      setOnlineUsers(count);
    });

    socket.on('user_joined', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        system: true,
        message: `${data.username} joined the stream`
      }]);
    });

    socket.on('user_left', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        system: true,
        message: `${data.username} left the stream`
      }]);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      toast.error('Failed to connect to chat server');
    });

    return () => {
      if (socket) {
        socket.emit('leave_stream', { streamId });
        socket.disconnect();
      }
    };
  }, [streamId, appId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || !socketRef.current) return;

    socketRef.current.emit('send_message', {
      streamId,
      appId,
      message: inputMessage,
      username
    });

    setInputMessage('');
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Live Chat</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={connected ? 'default' : 'secondary'} className="gap-1">
              <Users className="w-3 h-3" />
              {onlineUsers}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Be the first to say something!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={msg.system ? 'text-center' : ''}>
                  {msg.system ? (
                    <p className="text-xs text-gray-400 italic">{msg.message}</p>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-blue-600">{msg.username}</span>
                        {msg.timestamp && (
                          <span className="text-xs text-gray-400">
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-800 break-words">{msg.message}</p>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-4">
          {!connected ? (
            <div className="text-center py-2">
              <p className="text-sm text-gray-500">Connecting to chat...</p>
            </div>
          ) : (
            <form onSubmit={sendMessage} className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type a message..."
                maxLength={500}
                disabled={!connected}
              />
              <Button type="submit" disabled={!inputMessage.trim() || !connected}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatWidget;

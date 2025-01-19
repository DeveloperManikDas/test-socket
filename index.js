import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const server = createServer(app);
const io = new Server(server);

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

io.on('connection', async (socket) => {
  console.log('a user connected:', socket.id);

  socket.on('chat message', async (msg, clientOffset) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{ content: msg, client_offset: clientOffset }]);
      if (error) {
        console.error(error);
        return;
      }

      io.emit('chat message', msg);
    } catch (err) {
      console.error('Error inserting message:', err);
    }
  });

  // Send existing messages to the newly connected user
  const { data: messages, error } = await supabase
    .from('messages')
    .select('content')
    .order('id', { ascending: true });

  if (!error) {
    messages.forEach((message) => {
      socket.emit('chat message', message.content);
    });
  } else {
    console.error('Error fetching messages:', error);
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

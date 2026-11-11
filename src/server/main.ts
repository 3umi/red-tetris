import { createApp } from './app';

const PORT = Number(process.env.PORT) || 3000;

const { httpServer } = createApp();

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

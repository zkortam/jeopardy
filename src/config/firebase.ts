import { initializeApp } from 'firebase/app';
import { getDatabase, ref } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyBH0bPlAPy7VhnpaHlIIQaMl5tdmxOj04Y',
  authDomain: 'esagbm.firebaseapp.com',
  databaseURL: 'https://esagbm-default-rtdb.firebaseio.com',
  projectId: 'esagbm',
  storageBucket: 'esagbm.firebasestorage.app',
  messagingSenderId: '996228432570',
  appId: '1:996228432570:web:910b042241031ff6fd7883',
  measurementId: 'G-N44KJ9F70M',
};

const app = initializeApp(firebaseConfig);

export const database = getDatabase(app);

export const getRoomRef = (roomCode: string) => ref(database, `rooms/${roomCode}`);
export const getTeamsRef = (roomCode: string) => ref(database, `rooms/${roomCode}/teams`);
export const getBuzzerRef = (roomCode: string) => ref(database, `rooms/${roomCode}/buzzer`);
export const getNewRoomRef = (roomCode: string) => ref(database, `rooms/${roomCode}/newRoom`);

export const generateRoomCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

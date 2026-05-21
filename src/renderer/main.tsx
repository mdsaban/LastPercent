import React from 'react';
import { createRoot } from 'react-dom/client';
import { Dropdown } from './views/Dropdown';
import { Settings } from './views/Settings';
import { NotchAlert } from './views/NotchAlert';
import './styles/globals.css';

const hash = window.location.hash;
const root = document.getElementById('root')!;

if (hash === '#notch') {
  createRoot(root).render(<NotchAlert />);
} else if (hash === '#settings') {
  createRoot(root).render(<Settings />);
} else {
  createRoot(root).render(<Dropdown />);
}

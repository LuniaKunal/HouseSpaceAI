import React from 'react';
import { PhotoAccount } from '../auth/PhotoAccount';
import { PhotoDesignPage } from './PhotoDesignPage';

export default function PhotoWorkspace() {
  return <PhotoAccount><PhotoDesignPage /></PhotoAccount>;
}

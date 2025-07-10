import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.js'
import GoogleLogo from '../assets/GoogleLogo.svg'
import { Capacitor } from '@capacitor/core';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/', { replace: true });
  }, [navigate]);
  return null;
};

export default LoginPage; 
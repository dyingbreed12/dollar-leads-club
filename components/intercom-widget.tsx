'use client';

import { useSession } from 'next-auth/react';
import Script from 'next/script';
import { useEffect, useState, useCallback } from 'react';

declare global {
  interface Window {
    Intercom: (command: string, options?: Record<string, unknown>) => void;
    intercomSettings: Record<string, unknown>;
  }
}

export function IntercomWidget() {
  const { data: session, status } = useSession();
  const [userJwt, setUserJwt] = useState<string | null>(null);
  const [isIntercomReady, setIsIntercomReady] = useState(false);
  const appId = process.env.NEXT_PUBLIC_FIN_APP_ID;

  // Fetch JWT for identity verification
  useEffect(() => {
    async function fetchUserJwt() {
      if (session?.user?.id) {
        try {
          const response = await fetch('/api/intercom/jwt');
          if (response.ok) {
            const data = await response.json();
            setUserJwt(data.token);
          }
        } catch (error) {
          console.error('Failed to fetch Intercom JWT:', error);
        }
      }
    }
    fetchUserJwt();
  }, [session?.user?.id]);

  // Poll for Intercom SDK to be ready
  useEffect(() => {
    if (isIntercomReady) return;

    const checkIntercom = () => {
      if (typeof window !== 'undefined' && window.Intercom && typeof window.Intercom === 'function') {
        setIsIntercomReady(true);
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkIntercom()) return;

    // Poll every 100ms until ready
    const interval = setInterval(() => {
      if (checkIntercom()) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isIntercomReady]);

  // Boot Intercom with user identity
  const bootIntercom = useCallback(() => {
    if (!isIntercomReady || !appId || status === 'loading') return;

    if (session?.user && userJwt) {
      // Shutdown to clear any cached user_hash, then boot fresh with JWT only
      window.Intercom('shutdown');
      window.Intercom('boot', {
        api_base: 'https://api-iam.intercom.io',
        app_id: appId,
        intercom_user_jwt: userJwt,
        subscription_plan: session.user.subscription_plan,
      });
    } else if (!session?.user && status === 'unauthenticated') {
      // Anonymous visitor - boot without identity
      window.Intercom('boot', {
        api_base: 'https://api-iam.intercom.io',
        app_id: appId,
      });
    }
  }, [isIntercomReady, session, userJwt, status, appId]);

  useEffect(() => {
    bootIntercom();
  }, [bootIntercom]);

  if (!appId) {
    return null;
  }

  return (
    <Script
      id="intercom-widget"
      strategy="lazyOnload"
      dangerouslySetInnerHTML={{
        __html: `
          (function(){var w=window;var ic=w.Intercom;if(typeof ic==="function"){ic('reattach_activator');}else{var d=document;var i=function(){i.c(arguments);};i.q=[];i.c=function(args){i.q.push(args);};w.Intercom=i;var l=function(){var s=d.createElement('script');s.type='text/javascript';s.async=true;s.src='https://widget.intercom.io/widget/${appId}';var x=d.getElementsByTagName('script')[0];x.parentNode.insertBefore(s,x);};if(document.readyState==='complete'){l();}else if(w.attachEvent){w.attachEvent('onload',l);}else{w.addEventListener('load',l,false);}}})();
        `,
      }}
    />
  );
}

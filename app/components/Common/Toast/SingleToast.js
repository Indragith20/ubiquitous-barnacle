import React, { useEffect, useRef } from 'react';
import afterTransition from '~/components/utils/transitionElement';
import styles from './Toast.css';


export const ToastStyleLinks = () => ([
  { rel: 'stylesheet', href: styles }
])

function Toast({ message = 'Sucess Message', timeout = 5000, type, onDismiss, id }) {
  let timer = useRef(null);
  let toastRef = useRef(null);

  useEffect(() => {
    if (timeout !== Infinity) {
      timer.current = setTimeout(() => {
        toastRef.current.classList.add('exit-animation');
        afterTransition(toastRef.current).then(() => {
          toastRef.current = null;
          onDismiss(id)
        })
      }, timeout);
    }

    return () => {
      timer.current && clearTimeout(timer.current);
    }
  }, [timeout, id, onDismiss]);

  function onClose() {
    clearTimeout(timer.current);
    toastRef.current.classList.add('exit-animation');
    afterTransition(toastRef.current).then(() => {
      toastRef.current = null;
      onDismiss(id)
    })

  }

  useEffect(() => {
    return () => {
      toastRef.current = null;
    }
  }, [])

  return (
    <div className={`single-toast enter-animation`} ref={toastRef}>
      <div className='main-toast'>
        <span>{message}</span>
        <svg onClick={onClose} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </div>

    </div>
  );
}

export default React.memo(Toast);
import { useCallback, useEffect, useState } from 'react';

function readStoredValue(key, initialValue) {
  if (typeof window === 'undefined') return initialValue;

  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue === null ? initialValue : JSON.parse(storedValue);
  } catch (error) {
    console.error(`No se pudo leer el almacenamiento local "${key}"`, error);
    return initialValue;
  }
}

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => readStoredValue(key, initialValue));

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`No se pudo guardar el almacenamiento local "${key}"`, error);
    }
  }, [key, value]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== key) return;

      if (event.newValue === null) {
        setValue(initialValue);
        return;
      }

      try {
        setValue(JSON.parse(event.newValue));
      } catch (error) {
        console.error(`No se pudo sincronizar el almacenamiento local "${key}"`, error);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [initialValue, key]);

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setValue(initialValue);
    } catch (error) {
      console.error(`No se pudo borrar el almacenamiento local "${key}"`, error);
    }
  }, [initialValue, key]);

  return [value, setValue, removeValue];
}

export default useLocalStorage;

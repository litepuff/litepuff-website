import { useEffect, useState } from 'react';
import { getProducts } from '../services/productService';

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getProducts().then((data) => {
      setProducts(data);
      setIsLoading(false);
    });
  }, []);

  return { products, isLoading };
}

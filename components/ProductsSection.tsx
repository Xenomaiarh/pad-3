
import React from "react";
import ProductItem from "./ProductItem";
import Heading from "./Heading";
import apiClient from "@/lib/api";

const ProductsSection = async () => {
  let products: any[] = [];
  
  try {
    // sending API request for getting all products
    const data = await apiClient.get("/api/products");
    
    if (!data.ok) {
      console.error('Failed to fetch products:', data.statusText);
      products = [];
    } else {
      const result = await data.json();
      // Ensure products is an array - handle both array and {items: [...]} format
      products = Array.isArray(result) ? result : (result?.items || []);
    }
  } catch (error) {
    console.error('Error fetching products:', error);
    products = [];
  }

  return (
    <div className="bg-blue-500 border-t-4 border-white">
      <div className="max-w-screen-2xl mx-auto pt-20">
        <Heading title="FEATURED PRODUCTS" />
        <div className="grid grid-cols-4 justify-items-center max-w-screen-2xl mx-auto py-10 gap-x-2 px-10 gap-y-8 max-xl:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
          {products.length > 0 ? (
            products.map((product: any) => (
              <ProductItem key={product.id} product={product} color="white" />
            ))
          ) : (
            <div className="col-span-full text-center text-white py-10">
              <p>No products available at the moment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsSection;

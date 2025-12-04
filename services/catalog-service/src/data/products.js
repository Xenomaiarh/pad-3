// Simple in-memory product dataset for catalog-service
module.exports = {
  products: [
    {
      id: 'p1',
      title: 'Wireless Headphones',
      description: 'Comfortable wireless headphones with noise cancellation.',
      price: 99.99,
      category: 'electronics',
      images: ['/images/headphones-1.jpg'],
      rating: 4.5,
      stock: 120
    },
    {
      id: 'p2',
      title: 'Gaming Mouse234555',
      description: 'Ergonomic gaming mouse with programmable buttons.',
      price: 49.5,
      category: 'electronics',
      images: ['/images/mouse-1.jpg'],
      rating: 4.2,
      stock: 80
    },
    {
      id: 'p3',
      title: 'Coffee Mug',
      description: 'Ceramic mug 350ml.',
      price: 9.99,
      category: 'home',
      images: ['/images/mug-1.jpg'],
      rating: 4.0,
      stock: 300
    },
    {
      id: 'p4',
      title: 'Yoga Mat',
      description: 'Non-slip yoga mat 6mm.',
      price: 25.0,
      category: 'fitness',
      images: ['/images/yogamat-1.jpg'],
      rating: 4.6,
      stock: 50
    }
  ],

  categories: [
    { id: 'electronics', name: 'Electronics' },
    { id: 'home', name: 'Home' },
    { id: 'fitness', name: 'Fitness' }
  ]
};

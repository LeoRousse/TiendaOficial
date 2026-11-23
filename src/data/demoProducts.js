export const demoProducts = [
  {
    id: "demo-react",
    name: "Curso React desde cero",
    category: "programming",
    description: "Componentes, hooks, routing y un proyecto práctico.",
    price: 12000,
    stock: 8,
    level: "Principiante",
    img: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "demo-javascript",
    name: "JavaScript moderno",
    category: "programming",
    description: "Fundamentos modernos, asincronía y buenas prácticas.",
    price: 9500,
    stock: 12,
    level: "Intermedio",
    img: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "demo-ui",
    name: "Diseño UI profesional",
    category: "design",
    description: "Jerarquía visual, tipografía, color y componentes reutilizables.",
    price: 11000,
    stock: 5,
    level: "Intermedio",
    img: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "demo-figma",
    name: "Figma para interfaces",
    category: "design",
    description: "Wireframes, prototipos y sistemas de diseño en Figma.",
    price: 10500,
    stock: 7,
    level: "Principiante",
    img: "https://images.unsplash.com/photo-1613909207039-6b173b755cc1?auto=format&fit=crop&w=700&q=80",
  },
];

export const getDemoStock = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("tienda-quiroga-demo-stock"));
    return saved || Object.fromEntries(demoProducts.map((product) => [product.id, product.stock]));
  } catch {
    return Object.fromEntries(demoProducts.map((product) => [product.id, product.stock]));
  }
};

export const getDemoProducts = () => {
  const stock = getDemoStock();
  return demoProducts.map((product) => ({ ...product, stock: stock[product.id] ?? 0 }));
};

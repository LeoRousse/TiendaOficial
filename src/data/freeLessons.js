const freeLessons = {
  '4KPZIEGZ6lj7hzjf7gLM': {
    title: 'Filtra una lista con JavaScript',
    objective: 'Usa funciones, arreglos y eventos para encontrar tareas.',
    concept:
      'filter() crea una lista nueva con los elementos que cumplen una condición.',
    steps: [
      'Escribe en el buscador para filtrar las tareas.',
      'Prueba una palabra como «web» o «datos».',
      'Cambia la lista o la condición y pulsa Ejecutar.',
    ],
    code: `import { useState } from "react";

const tasks = ["Aprender JavaScript", "Crear una web", "Explorar datos"];

export default function App() {
  const [search, setSearch] = useState("");
  const results = tasks.filter((task) =>
    task.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 420, margin: "40px auto", padding: 20 }}>
      <h1>Buscador de tareas</h1>
      <label htmlFor="search">Filtrar tareas</label>
      <input
        id="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Escribe: web"
        style={{ display: "block", width: "100%", padding: 10, margin: "8px 0 16px", border: "1px solid #cbd5e1", borderRadius: 8 }}
      />
      {results.length > 0 ? (
        <ul>{results.map((task) => <li key={task}>{task}</li>)}</ul>
      ) : (
        <p>No hay tareas con ese nombre.</p>
      )}
    </main>
  );
}`,
  },
  'S9EVaISnr66gUfJO61mx': {
    title: 'Tu primer estado en React',
    objective: 'Actualiza la interfaz en respuesta a una acción.',
    concept:
      'useState guarda un valor. Al cambiarlo con su función, React vuelve a renderizar el componente.',
    steps: [
      'Pulsa el botón para cambiar el contador.',
      'Prueba también el botón Restablecer.',
      'Cambia el valor inicial o el paso y pulsa Ejecutar.',
    ],
    code: `import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 420, margin: "48px auto", padding: 24, textAlign: "center" }}>
      <p style={{ color: "#6d28d9", fontWeight: 700 }}>LECCIÓN DE REACT</p>
      <h1>Estado y eventos</h1>
      <p style={{ fontSize: 48, margin: "16px 0" }}>{count}</p>
      <button
        onClick={() => setCount(count + 1)}
        style={{ border: 0, borderRadius: 8, padding: "10px 14px", color: "white", background: "#6d28d9", cursor: "pointer" }}
      >
        Sumar uno
      </button>{" "}
      <button
        onClick={() => setCount(0)}
        style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "10px 14px", background: "white", cursor: "pointer" }}
      >
        Restablecer contador
      </button>
    </main>
  );
}`,
  },
  'gVdLhdDDS7Z9fMat6oqK': {
    title: 'Crea una lista de contactos',
    objective: 'Conecta un formulario con el estado y la lista de una app.',
    concept:
      'Un formulario controlado lee sus valores desde el estado y actualiza la pantalla al enviar.',
    steps: [
      'Escribe un nombre y agrégalo a la lista.',
      'Prueba agregar más de un contacto.',
      'Edita el formulario y pulsa Ejecutar para probar tus cambios.',
    ],
    code: `import { useState } from "react";

export default function App() {
  const [name, setName] = useState("");
  const [contacts, setContacts] = useState(["Ada Lovelace", "Alan Turing"]);

  function addContact(event) {
    event.preventDefault();
    const newName = name.trim();
    if (!newName) return;
    setContacts([...contacts, newName]);
    setName("");
  }

  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 420, margin: "40px auto", padding: 20 }}>
      <h1>Contactos</h1>
      <form onSubmit={addContact}>
        <label htmlFor="name">Nombre del contacto</label>
        <input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ej.: Grace Hopper"
          style={{ display: "block", width: "100%", padding: 10, margin: "8px 0", border: "1px solid #cbd5e1", borderRadius: 8 }}
        />
        <button
          type="submit"
          style={{ border: 0, borderRadius: 8, padding: "10px 14px", color: "white", background: "#6d28d9", cursor: "pointer" }}
        >
          Agregar contacto
        </button>
      </form>
      <ul>{contacts.map((contact) => <li key={contact}>{contact}</li>)}</ul>
      <p style={{ color: "#64748b" }}>Demo local: los cambios no se guardan.</p>
    </main>
  );
}`,
  },
};

export default freeLessons;

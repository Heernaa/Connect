"""Palabras para generar los alias anónimos.

Son **contenido**, no lógica (§2.1.2 aplica al contenido de los juegos; aquí se
aplica la misma idea de legibilidad). Vive en su propio archivo para que el
generador sea legible y para que cambiar el estilo de los nombres no obligue a
tocar la lógica.

Los adjetivos son positivos y amables: un alias aparece al lado de la puntuación
de otra persona, y un nombre hostil no aporta nada.
"""

ADJECTIVES: tuple[str, ...] = (
    "Tranquilo",
    "Sereno",
    "Alegre",
    "Curioso",
    "Sabio",
    "Valiente",
    "Amable",
    "Calmoso",
    "Luminoso",
    "Firme",
    "Gentil",
    "Nítido",
    "Franco",
    "Sincero",
    "Ordenado",
    "Callado",
    "Fuerte",
    "Claro",
    "Honesto",
)

ANIMALS: tuple[str, ...] = (
    "Lobo",
    "Gato",
    "Búho",
    "Ciervo",
    "Tortuga",
    "Zorro",
    "Lince",
    "Ardilla",
    "Cóndor",
    "Panda",
    "Nutria",
    "Cangrejo",
    "Búfalo",
    "Delfín",
    "Halcón",
    "Ganso",
    "Mapache",
    "Pingüino",
    "Camaleón",
    "Rana",
)
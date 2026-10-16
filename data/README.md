# data — Contenido de los juegos

Aquí vive **todo el contenido** de los juegos: palabras de Wordle, pistas de
Paraulógic, acertijos y sus respuestas.

## Por qué en un archivo y no en el código

El contenido es un dato, no una constante del programa. Vive en
[`seed_v0.sql`](./seed_v0.sql) y la base de datos es la única fuente de verdad
(§2.1.2). En el cliente **no hay ni una palabra de juego escrita a mano**.

## Contenido del MVP

| Juego | Cantidad | Detalle |
| --- | --- | --- |
| Wordle | 1 palabra | `LUNAS` |
| Acertijo | 1 | «Tengo ciudades… ¿Qué soy?» → el mapa |
| Paraulógic | 1 set | Letras `A E N R S T` → **21 palabras** |

Definido en §2.1.8 de la constitución. La mejora del contenido es una **tarea
manual**: no hay rotación por fecha ni «palabra del día» (§2.1.3).

## Regla de formación de Paraulógic

Cada palabra usa **solo** letras del conjunto y **ninguna letra más veces** de
las que aparece en él. Se verifica por script, no a ojo: el test de integridad
de la spec 002 falla si alguna palabra incumple.
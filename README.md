# Cellular Automata

Simple Vue implementation of Conway's Game of Life and Craig Reynolds' Boids flocking simulation.
Efficient way to calculate the nth row of Pascal's triangle added as a bonus.

Game of Life is modeled with the naive and inefficient solution of just keeping a set of alive cell
coordinates and running the neighbor calculations for each one. If you're interested in creating
an efficient version of modeling the Game of Life, here are some nice resources for that:
http://www.jagregory.com/abrash-black-book/#chapter-17-the-game-of-life
http://www.marekfiser.com/Projects/Conways-Game-of-Life-on-GPU-using-CUDA

The Boids model utilizes k-d trees for efficient nearest neighbor calculations, allowing larger flock sizes
with acceptable frame rates. Quadtrees would also be an option, but k-d trees seemed to perform a bit better.
Web workers are also used to squeeze out some extra performance. Web workers have diminishing returns though
as the message latency starts to get bigger, so more than 3 workers actually degraded performance.

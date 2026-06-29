# MovieDB Recommendations

## Contract

- Do not recommend movies whose IDs are in user.watchedMovieIds.
- A movie is eligible when rating >= minRating.
- A movie must share at least one preferred genre.
- Results are sorted by rating descending, then title ascending.

function AI(grid) {
  this.grid = grid;
}

// static evaluation function
AI.prototype.evaluate = function() {
  var emptyCells = this.grid.availableCells().length;

  var smoothWeight = 0.1,
      //monoWeight   = 0.0,
      //islandWeight = 0.0,
      mono2Weight  = 1.0,
      emptyWeight  = 2.7,
      maxWeight    = 1.0;

  return this.grid.smoothness() * smoothWeight
    //+ this.grid.monotonicity() * monoWeight
    //- this.grid.islands() * islandWeight
    + this.grid.monotonicity2() * mono2Weight
    + Math.log(emptyCells) * emptyWeight
    + this.grid.maxValue() * maxWeight;
};

//AI.prototype.cache = {}

// alpha-beta depth first search
AI.prototype.search = function(depth, alpha, beta, positions, cutoffs) {
  var bestScore, result, bestMove, direction;
  bestMove = -1;

  // the maxing player
  if (this.grid.playerTurn) {
    bestScore = alpha;
    for (direction = 0; direction < 4; direction++) {
      var newGrid = this.grid.clone();
      if (newGrid.move(direction).moved) {
        positions++;
        if (newGrid.isWin()) {
          return { move: direction, score: 10000, positions: positions, cutoffs: cutoffs };
        }
        var newAI = new AI(newGrid);

        if (depth === 0) {
          result = { move: direction, score: newAI.evaluate() };
        } else {
          result = newAI.search(depth-1, bestScore, beta, positions, cutoffs);
          if (result.score > 9900) { // win
            result.score--; // to slightly penalize higher depth from win
          }
          positions = result.positions;
          cutoffs = result.cutoffs;
        }

        if (result.score > bestScore) {
          bestScore = result.score;
          bestMove = direction;
        }
        if (bestScore > beta) {
          cutoffs++;
          return { move: bestMove, score: beta, positions: positions, cutoffs: cutoffs };
        }
      }
    }
  }

  else { // computer's turn, we'll do heavy pruning to keep the branching factor low
    bestScore = beta;

    // try a 2 and 4 in each cell and measure how annoying it is
    // with metrics from evaluate
    var candidates = [];
    var cells = this.grid.availableCells();
    var scores = { 2: [], 4: [] };
    var value;
    var i;
    for (value in scores) {
      if (scores.hasOwnProperty(value)) {
        for (i in cells) {
          if (cells.hasOwnProperty(i)) {
            scores[value].push(null);
            var cell = cells[i];
            var tile = new Tile(cell, parseInt(value, 10));
            this.grid.insertTile(tile);
            scores[value][i] = -this.grid.smoothness() + this.grid.islands();
            this.grid.removeTile(cell);
          }
        }
      }
    }

    // now just pick out the most annoying moves
    var maxScore = Math.max(Math.max.apply(null, scores[2]), Math.max.apply(null, scores[4]));
    for (value in scores) { // 2 and 4
      if (scores.hasOwnProperty(value)) {
        for (i = 0; i < scores[value].length; i++) {
          if (scores[value][i] === maxScore) {
            candidates.push( { position: cells[i], value: parseInt(value, 10) } );
          }
        }
      }
    }

    // search on each candidate
    for (i = 0; i < candidates.length; i++) {
      var position = candidates[i].position;
      value = candidates[i].value;
      newGrid = this.grid.clone();
      tile = new Tile(position, value);
      newGrid.insertTile(tile);
      newGrid.playerTurn = true;
      positions++;
      newAI = new AI(newGrid);
      result = newAI.search(depth, alpha, bestScore, positions, cutoffs);
      positions = result.positions;
      cutoffs = result.cutoffs;

      if (result.score < bestScore) {
        bestScore = result.score;
      }
      if (bestScore < alpha) {
        cutoffs++;
        return { move: null, score: alpha, positions: positions, cutoffs: cutoffs };
      }
    }
  }

  return { move: bestMove, score: bestScore, positions: positions, cutoffs: cutoffs };
}

// performs a search and returns the best move
AI.prototype.getBest = function() {
  //return this.iterativeDeep();
  return this.fixedDeep(2);
}

// performs iterative deepening over the alpha-beta search
AI.prototype.iterativeDeep = function() {
  var start = (new Date()).getTime();
  var depth = 0;
  var best;
  do {
    var newBest = this.search(depth, -10000, 10000, 0 ,0);
    if (newBest.move == -1) {
      //console.log('BREAKING EARLY');
      break;
    } else {
      best = newBest;
    }
    depth++;
  } while ( (new Date()).getTime() - start < minSearchTime);
  //console.log('depth', --depth);
  //console.log(this.translate(best.move));
  //console.log(best);
  return best
}

AI.prototype.fixedDeep = function (depth) {
  var searchDepth;
  searchDepth = depth || 0;

  return this.search(searchDepth, -10000, 10000, 0 ,0);
};


AI.prototype.translate = function(move) {
  return {
    0: 'up',
    1: 'right',
    2: 'down',
    3: 'left'
  }[move];
}


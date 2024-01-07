

// NOTE:  The "state" is a list of strings.   Because of recursion, it is very
// important the state is immutable, i.e do not change the list itself, instead
// use slice to construct a new state list.  The FIRST element of the state
// is the last move, i.e. '1,2' meaning pour from tube 1 to 2.  The content of each
// tube is string of single character color codes, top to bottom.
//
//  For example state = ['1,2', 'R', 'GBR', 'BBB', 'GBGG'] is four tubes

class State {
    constructor (tubes, m=[], s=0) {
        this.tubes = tubes;
        this.moves = m;
        this.score = s;
    }

    not_solved(m=0) {
        let n = 0;
        for (let t of this.tubes)
            if (top_length(t) < Math.max(m,t.length)) ++n;
        return n;    
    }


    num_empty() {
        let n = 0;
        for (let t of this.tubes)
            if (t.length == 0) ++n;
        return n;    
    }

    compute_score(m=0) {
        let n = this.tubes.length;
        let done = n - this.not_solved(m);
        let pure = n - this.not_solved();
        let empty = this.num_empty();
        this.score = done + pure + empty;
    }
}

// Return the length of the top color, e.g. 'AAB' returns 2.
function top_length(tube) {
    for (var i=0; i<tube.length && tube[i]==tube[0];) ++i;
    return i;
}


// Pour tube a into b. return [] if error, else new [a,b]
function pour(a,b,m) {
    if (a.length > 0 && (b.length==0 || a[0] == b[0])) {
        let i = top_length(a);
        if (i < m && i + b.length <= m) 
            return [a.slice(i),a.slice(0,i)+b];
    }
    return [];
}

// Given a state, find all descendents, i.e. all states that are the result of a valid action.
// If no actions are valid, return empty list.  m is the tube size.
function get_choices(state, m=4) {
    let tub = state.tubes
    let n = tub.length;
    let result = [];
    //let ei = 0;
    for (let i=0; i<n; ++i) {
        let ej = 0
        for (let j=i+1; j<n; ++j) {
            let [a1,b1] = pour(tub[i], tub[j], m);
            if (a1!=null && (tub[j].length || !ej)) {
                let t = new State(tub.slice(0,i).concat(a1, tub.slice(i+1,j), b1, tub.slice(j+1)),
                    state.moves.concat(i+'-'+j));
                result.push(t);
                if (!tub[j].length) ej = 1;
            }
            let [b2,a2] = pour(tub[j], tub[i], m);
            if (a2!=null && (a1 || b2)) {
                let t = new State(tub.slice(0,i).concat(a2, tub.slice(i+1,j), b2, tub.slice(j+1)),
                    state.moves.concat(j+'-'+i));
                result.push(t);
            }
        }
    }
    return result;
}

// INsert states into the todo, keep them ordered DESCENDING by score
function add_states(todo, states, m=0) {
    for (let s of states) {
        s.compute_score(m);
        for (var i=0; i<todo.length && todo[i].score > s.score; ) ++i;
        todo.splice(i,0,s);
    }
}


// Return a sequence of actions that will solve the water sort.  
function solve(state, m=4) {
    let todo = [state];
    while (todo.length > 0) {
        var a = todo.shift();         // BEST FIRST SEARCH
        if (a.not_solved(m) == 0) break;
        let b = get_choices(a, m);
        add_states(todo, b, m);
        console.log(todo.length,todo[0].moves.length);
    }
    return a;
}



function test_choices() {
    let a = new State(['ABC','AA','ACC','BBC','B']);
    console.log('=======================');
    console.log(a.moves,a.tubes);
    console.log('=======================\nfrom:',a.moves,a.tubes);
    a = get_choices(a);
    for (let x of a) console.log(x.moves,x.tubes);
    for (let y=0; y<20 && a.length; ++y) {
        console.log('=======================\nfrom:',a[0].moves,a[0].tubes);
        a = get_choices(a[0]);
        for (let x of a) console.log(x.moves,x.tubes);
    }
}


function test_solver(i) {
    let a = ['ABC','AA','ACC','BBC','B'];
    if (i==13) 
        a = ['rgpb','lggo','roGp','lbrg','lGpl','Gbop','obrG','',''];  // #13
    if (i==37) 
        a = ['abgG','ggpG','PrGo','apll','lrba','robr','GlpP','aooP','bpPg','','']; 
    console.log('=========\nTry to solve: ', a);
    let b = solve(new State(a));
    console.log('Solved: ',b.moves,b.tubes);
}

test_solver(13);
//test_choices();



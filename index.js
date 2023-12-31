

// NOTE:  The "state" is a list of strings.   Because of recursion, it is very
// important the state is immutable, i.e do not change the list itself, instead
// use slice to construct a new state list.  The FIRST element of the state
// is the last move, i.e. '1,2' meaning pour from tube 1 to 2.  The content of each
// tube is string of single character color codes, top to bottom.
//
//  For example state = ['1,2', 'R', 'GBR', 'BBB', 'GBGG'] is four tubes


// Return the length of the top color, e.g. 'AAB' returns 2.
function top_length(tube) {
    for (var i=0; i<tube.length && tube[i]==tube[0];) ++i;
    return i;
}


// Pour tube a into b. return [] if error, else new [a,b]
function pour(a,b,m) {
    if (a.length > 0 && (b.length==0 || a[0] == b[0])) {
        let i = top_length(a);
        if (i < a.length && i + b.length <= m) 
            return [a.slice(i),a.slice(0,i)+b];
    }
    return [];
}

// Given a state, find all descendents, i.e. all states that are the result of a valid action.
// If no actions are valid, return empty list.  m is the tube size.
function get_choices(state, m=4) {
    let n = state.length;
    let s = state
    let result = [];
    for (let i=1; i<n; ++i) {
        for (let j=i+1; j<n; ++j) if (i!=j) {
            let [a,b] = pour(s[i], s[j], m);
            if (a) {
                let t  = [s[0]+','+i+'-'+j].concat(s.slice(1,i), a, s.slice(i+1,j), b, s.slice(j+1));
                result.push(t);
            }
            [b,a] = pour(s[j], s[i], m);
            if (a) {
                let t  = [s[0]+','+j+'-'+i].concat(s.slice(1,i), a, s.slice(i+1,j), b, s.slice(j+1));
                result.push(t);
            }
        }
    }
    return result;
}


// Return the number of tubes that are NOT solved in the state
function not_solved(state) {
    let n = 0;
    for (let i=1; i<state.length; ++i) {
        if (top_length(state[i]) < state[i].length) ++n;
    }
    return n;
}


function test_choices() {
    let a = ['','ABC','AA','ACC','BBC','AAAA'];
    console.log('=======================');
    console.log(a);
    console.log('=======================\nfrom:',a);
    a = get_choices(a);
    for (let x of a) console.log(x);
    console.log('=======================\nfrom:',a[0]);
    a = get_choices(a[0]);
    for (let x of a) console.log(x);
    console.log('=======================\nfrom:',a[0]);
    a = get_choices(a[0]);
    for (let x of a) console.log(x);
    console.log('=======================\nfrom:',a[0]);
    a = get_choices(a[0]);
    for (let x of a) console.log(x);
}

// Return a sequence of actions that will solve the water sort.  
function solve(state, m=4) {
    let todo = [state];
    while (todo.length > 0) {
        var a = todo.shift();         // BREADTH FIRST SEARCH
        if (not_solved(a) == 0) break;
        let b = get_choices(a, m);
        todo = todo.concat(b);
        // console.log('Todo len = ',todo.length);
    }
    return a;//a[0].substring(1);
}

function test_solver(i) {
    let a = ['','ABC','AA','ACC','BBC','AAAA'];
    if (i==2) 
        a = ['','rgpb','lggo','roGp','lbrg','lGpl','Gbop','obrG','',''];  // #13
    console.log('=========\nTry to solve: ', a);
    let b = solve(a);
    console.log('Solved: ',b);
}


// GLOBAL DATA

var game = null;
var s0 = null;
var stack = [];
var intervalID = 0;

// NOTE:  The "state" is a list of strings.   Because of recursion, it is very
// important the state is immutable, i.e do not change the list itself, instead
// use slice to letruct a new state list.  The FIRST element of the state
// is the last move, i.e. '1,2' meaning pour from tube 1 to 2.  The content of each
// tube is string of single character color codes, top to bottom.
//
//  For example tubes = ['R', 'GRR', 'BBRB', 'GBGG'] is four tubes

class State {
    constructor (tubes, v=[], m=4, msg='') {
        this.tubes = tubes;
        this.moves = v;
        this.m = m;        // height of each tube (max water)
        this.msg = msg;
    }

    clone() {
        return new State([...this.tubes],this.moves,this.m);
    }

    // Return how many layers of different color in the i tube
    layers(i) {
        let tube = this.tubes[i];
        if (tube.length == 0) return 0;
        let count = 1;
        for (let i = 1; i < tube.length; i++)
            if (tube[i] != tube[i-1]) ++count;
        return count;
    }

    // Return how thick is the top layer in the i tube
    top(i) {
        let tube = this.tubes[i];
        let count = 0;
        for (let i = 0; i < tube.length; i++)
            if (tube[i] == tube[0]) ++count;
            else break;
        return count;
    }

    // Return how much room is left in tube
    gap(i) {
        return this.m - this.tubes[i].length;
    }

    depth(i) {
        return this.tubes[i].length;
    }

    is_pure(i) {
        return this.top(i) == this.tubes[i].length;
    }

    is_full(i) {
        return this.tubes[i].length == this.m;
    }

    is_done(i) {
        return this.top(i) == this.m;
    }

    is_all_done() {
        for (let i in this.tubes) 
            if (!this.is_done(i) && !this.is_empty(i)) 
                return false;
        return true;
    }

    is_empty(i) {
        return this.tubes[i].length == 0;
    }

    find_empty() {
        for (let j=0; j<this.tubes.length; ++j) 
            if (this.is_empty(j)) return j;
        return -1;
    }


    // Return list of tube indicies with same top color as i-th
    // when a='top' only return those that can pour the entire top into i.
    // Note if i is empty, then a is the desired top color
    find(i, a='any') {
        let c = this.is_empty(i) ? a : this.tubes[i][0];
        let result = [];
        for (let j=0; j<this.tubes.length; ++j) {
            if (i!=j && this.tubes[j].startsWith(c)) {
                let t = this.top(j);
                if (t != this.m && (a=='any' || t <= this.gap(i)))
                    result.push(j);
            }
        }
        return result;
    }


    sumtop(indices) {
        let s = 0;
        for (let i of indices) s += this.top(i);
        return s;
    }

    // Returns a copy of the state
    copy(msg='') {
        return new State(Array.from(this.tubes), this.moves, this.m, msg);
    }

    // returns number of tubes with same top color as i
    match(i) {
        let n = 0;
        for (let j in this.tubes) if (i!=j && 
            !this.is_empty(j) && this.tubes[i][0]==this.tubes[j][0]) ++n;
        return n;
    }

    //Returns a new state, or null if not valid (check size, not color)
    pour(i,j,msg='') {
        let n = Math.min(this.top(i), this.gap(j));
        if (n < 1) return null;
        let t = this.copy(msg);
        t.tubes[j] = t.tubes[i].substring(0,n) + t.tubes[j];
        t.tubes[i] = t.tubes[i].substring(n);
        t.moves += (',' + i + '-' + j);
        return t;
    }

    //Returns a new state, or null if not valid (check size, not color)
    pour_many(ii,j,msg='') {
        let r = this.copy(msg);
        for (let i of ii) {
            let n = Math.min(r.top(i), r.gap(j));
            if (n < 1) break;
            r.tubes[j] = r.tubes[i].substring(0,n) + r.tubes[j];
            r.tubes[i] = r.tubes[i].substring(n);
            r.moves += (',' + i + '-' + j);
        }
        return r;
    }

    // Alter the tubes by a random REVERSE pour (reset all moves)
    unpour() {
        let s = [];
        for (let i in this.tubes) {
            if (this.is_empty(i)) continue;
            for (let j in this.tubes) {
                if (i!=j && !this.is_full(j) && (this.is_full(i) || 
                    this.is_empty(j) || this.tubes[j][0]!=this.tubes[i][0]))
                    s.push([i,j]);
            }
        }
        s = s[Math.trunc(Math.random()*s.length)]
        let i = s[0]; 
        let j = s[1];
        let n = this.top(i);
        if (this.is_empty(j) || this.tubes[j][0]!=this.tubes[i][0])
            n = Math.trunc(this.top(i) * Math.random()) + 1;
        n = Math.min(n, this.gap(j));
        this.tubes[j] = this.tubes[i].substring(0,n) + this.tubes[j];
        this.tubes[i] = this.tubes[i].substring(n);
        console.log('UNPOUR',i,j);
    }


    render() {
        let result='';
        for (let t of this.tubes) {
            result += `<div><div class="lip"></div>`;
            for (let i=0; i<this.m-t.length; ++i)
                result += `<div class="gap"></div>`;
            for (let i of t)
                result += `<div class="${i}"></div>`;
            result += `</div>`;
        }
        return result;
    }

}

// Given a state, find The best moves.  There are really only three kinds of moves
// 1. pour into a PURE tube (all one color). branch=1
// 2. pour from one mixed tube to another. Give preference to lowest branch factor,
//     i.e from full to only one option.
// 3. pour into an EMPTY tube. Sort options according to max-sum-top.
//
function get_choices(s) {
    let n = s.tubes.length;

    // 1. pour any matching tube into a pure tube that isn't full
    for (let i=0; i<n; ++i) {
        if (!s.is_pure(i) || s.is_full(i)) 
            continue;
        let t = s.find(i);
        if (t.length) 
            return [s.pour(t[0],i,'into pure')];
    }

    let into = [];
    for (let i=0; i<n; ++i)
        if (!s.is_full(i) && s.layers(i) > 1) 
            into.push(i);
    into.sort(j => -(s.layers(j)*100 + s.depth(j)*10 + s.top(j)));

    // 2a. pour mixed to mixed, simple only
    for (let i of into) {
        let t = s.find(i,'top');
        if (t.length==1 && s.match(i)==1) {
            return [s.pour(t[0],i,'simple')];
        }
    }

    // 2b. pour mixed to mixed, complex case
    for (let i of into) {
        let t = s.find(i);
        if (t.length < 2) 
            continue;
        // Having determined that at least two other tubes can pour into i, 
        // compute all permutations of pouring between the tubes.  And sort
        // them in order to get pure tubes as soon as possible.
        t.push(i);
        t.sort(j => s.layers(j)*100 + s.depth(j)*10 + s.top(j));
        let a = t.flatMap(i => t.map(j => i!=j ? s.pour(i,j,'complex') : null));
        return a.filter(x => x != null);
    }

    // 3. last resort: pour into an empty tube
    let i = s.find_empty();
    if (i >= 0) {
        let k = '';
        let family = [];
        for (let j=0; j<n; ++j) {
            if (i==j || s.is_empty(j) || s.is_done(j)) 
                continue;
            let c = s.tubes[j][0];
            if (k.indexOf(c) + 1) 
                continue;
            k += c;
            let t = s.find(i,c);
            if (t.length == 1 && s.is_pure(j)) 
                continue;
            family.push(t);
        }
        //family.sort(t => -s.sumtop(t));
        return family.map(t => s.pour_many(t,i,'into empty'));
    }

    return [];    // Dead End == no more choices.
}


function draw_tubes(data) {
    let e = document.getElementById('tubes');
    e.innerHTML = data;
}

function draw_stack(msg,stack) {
    let e = document.getElementById('stack');
    if (!stack) {
        stack = [];
    }
    e.innerHTML = `${msg?msg+'<br>':''}${stack.length}<br>
            ${stack.map(s => s.moves + ' <br> ')}`;
}

function stop() {
    if (intervalID > 0) {
        clearInterval(intervalID);
        console.log('stop done',intervalID);
        intervalID = 0;
    }
}

function start(x=500) {
    stop();
    intervalID = setInterval(step, x);
}

function step() {    
    let m='';
    if (stack) game = stack.shift();
    let b = get_choices(game);
    if (b.length==0) {
        m = 'Dead End!';
        if (game.is_all_done()) {
            m = 'Success! <hr> Moves: ' + game.moves.substring(1) + '<hr>';
            stop();
        }
    }
    stack = b.concat(stack);
    draw_tubes(game.render());
    draw_stack(m,stack);
}


function on_scramble() {
    console.log('begin on_scramble');
    stop();
    for (let i=0; i<30; ++i)
        game.unpour();
    game.moves = '';
    game.msg = 'scrambled';
    stack = get_choices(game);
    draw_tubes(game.render());
    draw_stack(game.msg,stack);
}

function on_rewind() {
    console.log('begin on_rewind');
    game = s0.clone();
    stack = get_choices(game);
    draw_tubes(game.render());
    draw_stack(game.msg,stack);
}

function on_backstep() {
    console.log('begin on_backstep');
}

function on_step() {
    console.log('begin on_step');
    if (intervalID > 0) stop();
    else step();
}

function on_play() {
    console.log('begin on_play');
    start(300);
}

function on_ff() {
    console.log('begin on_ff');
    start(50);
}

function on_touch(i) {
    console.log('begin touch',i);
}

function on_setup() {
    console.log('begin on_setup');
    stop();
    let data = document.getElementById('setup').value;
    let tubes = null;
    // BELOW ARE TEST CASES, just type the number in setup
    if (data==37) tubes = ['ABgE','ggPE','rREY','APbb','bRBA','RYBR','EbPr','AYYr','BPrg','','']
    else if (data==2) tubes = ['GRR','GGB','GRR','BBB','R'];
    else if (data==3) tubes = ['rgg', 'b', 'rrgg', 'rbbb'];
    else if (data==4) tubes = ['rrrr','bbbb','gggg','EEEE','',''];
    else if (data==5) tubes = ['rrrr','bbbb','gggg','EEEE','BBBB','',''];
    else if (data==6) tubes = ['rrrr','bbbb','gggg','EEEE','BBBB','AAAA','',''];
    else if (data==39) tubes = ['grbB','rEYR','YBBb','RbYr','YgBr','RbgE','EREg','',''];
    else if (data==40) tubes = ['YErA','PbgY','gBAr','Ebbr','BrAB','RBPR','EPgb','ARgE','PYRY','',''];
    else if (data==51) tubes = ['gYrB','bgRr','brbR','gEBY','RYEY','RBEE','Bgrb','',''];
    else tubes = data.split(',').map(s => s.trim());
    let tlen = tubes.map(t => t.length);
    game = new State(tubes, '', Math.max(4,...tlen));
    s0 = game.clone();
    stack = get_choices(game);
    draw_tubes(game.render());
    draw_stack(game.msg,stack);
}

function show_colors() {
    msg = `Enter tubes top to bottom, left to right, separated by comma, 
    such as RrBG,EgrR,... 
    Add an extra comma at the end for each empty tube.
    <br>Colors:
    <br>
    <span class="R"> &nbsp; R &nbsp; </span>
    <span class="G"> &nbsp; G &nbsp; </span>
    <span class="B"> &nbsp; B &nbsp; </span>
    <span class="Y"> &nbsp; Y &nbsp; </span>
    <span class="C"> &nbsp; C &nbsp; </span>
    <span class="P"> &nbsp; P &nbsp; </span>
    <span class="A"> &nbsp; A &nbsp; </span>
    <span class="E"> &nbsp; E &nbsp; </span>
    <br>
    <span class="r"> &nbsp; r &nbsp; </span>
    <span class="g"> &nbsp; g &nbsp; </span>
    <span class="b"> &nbsp; b &nbsp; </span>
    <span class="y"> &nbsp; y &nbsp; </span>
    <span class="c"> &nbsp; c &nbsp; </span>
    <span class="p"> &nbsp; p &nbsp; </span>
    <span class="a"> &nbsp; a &nbsp; </span>
    <span class="e"> &nbsp; e &nbsp; </span>
    <p>Or some number, like 37 or 51 to run a testcase.`;
    draw_stack(msg);
    return true;
}

function test_render() {
    tubes = ['BGGR','GGRB','BBR','GR'];
    s = new State(tubes);
    draw_tubes(s.render());
}


// Return a sequence of actions that will solve the water sort.  
// function solve(state) {
//     let todo = [state];
//     while (todo.length > 0) {
//         var a = todo.shift();         // BEST FIRST SEARCH
//         //if (a.not_solved() == 0) break;
//         let b = get_choices(a);
//         todo.unshift(...b);
//         console.log(todo.length,todo[0].msg,todo[0].moves);
//     }
//     return a;
// }



function test_choices() {
    let a = new State(['ABC','AB','ACC','BC','BCA']);
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


// function test_solver(i) {
//     let a = ['ABC','AA','ACC','BBC','B'];
//     if (i==13) 
//         a = ['rgpb','lggo','roGp','lbrg','lGpl','Gbop','obrG','',''];  // #13
//     if (i==99) 
//         a = ['GRR','GGB','GRR','BBB'];  // VERY TRICKY
//     if (i==37) 
//         a = ['abgG','ggpG','PrGo','apll','lrba','robr','GlpP','aooP','bpPg','','']; 
//     console.log('=========\nTry to solve: ', a);
//     let b = solve(new State(a));
//     console.log('Solved: ',b.moves,b.tubes);
// }



//test_solver(1);
//test_choices();
//test_render();
setTimeout(() => on_setup(37),1);



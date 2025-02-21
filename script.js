// Start server

// python -m http.server 8080

kaboom({

    background: [30, 30, 50],

    width: 800,

    height: 600,

    canvas: document.getElementById("cv"),

    letterbox: true,

    debug: true,

    maxFPS: 90,

    // scale: 2

});



function loadAllSprites() {

    loadSprite("playerIdle", "src/1_Cat_Idle-Sheet.png", {

        sliceX: 4,

        sliceY: 2,

        anims: {

            anim: { from: 0, to: 7, loop: true },

        },

    });

    loadSprite("playerRun", "src/2_Cat_Run-Sheet.png", {

        sliceX: 5,

        sliceY: 2,

        anims: {

            anim: { from: 0, to: 9, loop: true },

        },

    });

    loadSprite("playerJump", "src/3_Cat_Jump-Sheet.png", {

        sliceX: 2,

        sliceY: 2,

        anims: {

            anim: { from: 0, to: 3, loop: true },

        },

    });

    loadSprite("playerFall", "src/4_Cat_Fall-Sheet.png", {

        sliceX: 2,

        sliceY: 2,

        anims: {

            anim: { from: 0, to: 3, loop: true },

        },

    });

    ["up", "left", "right", "down"].forEach(e => {

        loadSprite(`grapple${e}`, `src/grapple${e}.png`);

        loadSprite(`grappleline${e}`, `src/grappleline${e}.png`);

    })

}

loadAllSprites();



let playerSpr = add([

    sprite("playerRun"),

    pos(401, 301),

    scale(2),

    {

        sprite: "playerRun",

        face: 0, // (0 é direita, 1 é esquerda, msm q o flipX)

    } 

])



playerSpr.play("anim");



let player = add([

    rect(20, 32),

    color(255, 255, 0, 0),

    pos(playerSpr.pos.x + 10, playerSpr.pos.y + 25),

    area(),

    "player",

    {

        w: 20,

        h: 32,

        velX: 0,

        velY: 0,

        moveVelX: 0,

        grappleState: 0,

        grappleDirection: "left"

        /**

         * 0: Sem grapple

         * 1: Grapple lançando

         * 2: Grapple voltando

         * 3: Personagem sendo puxado

         * 4: Personagem no final do grapple

         */

    }

])

player.opacity = 0.5;



const CollisionTileSize = 40;

const GrappleVel = 36;

const GrappleSpeedBoost = 10;

const MaxGrappleLength = 300;

const grappleOriginDist = 10;



function areRectanglesColliding(rect1, rect2) {

    let noHorizontalOverlap = rect1.pos.x + rect1.w <= rect2.pos.x || rect2.pos.x + rect2.w <= rect1.pos.x;



    let noVerticalOverlap = rect1.pos.y + rect1.h <= rect2.pos.y || rect2.pos.y + rect2.h <= rect1.pos.y;



    return !(noHorizontalOverlap || noVerticalOverlap);

}



function areRectanglesCollidingRotate(rotatedRect, nonRotatedRect) {

    // Rotated rectangle properties

    const rotatedCenterX = rotatedRect.pos.x;

    const rotatedCenterY = rotatedRect.pos.y;

    const rotatedWidth = rotatedRect.w;

    const rotatedHeight = rotatedRect.h;

    const rotatedAngle = rotatedRect.angle * (Math.PI / 180); // Convert to radians



    // Non-rotated rectangle properties

    const nonRotatedLeft = nonRotatedRect.pos.x;

    const nonRotatedTop = nonRotatedRect.pos.y;

    const nonRotatedWidth = nonRotatedRect.w;

    const nonRotatedHeight = nonRotatedRect.h;



    // Calculate the corners of the rotated rectangle

    const cosAngle = Math.cos(rotatedAngle);

    const sinAngle = Math.sin(rotatedAngle);



    const rotatedCorners = [

        { x: rotatedCenterX + (rotatedWidth / 2) * cosAngle - (rotatedHeight / 2) * sinAngle,

          y: rotatedCenterY + (rotatedWidth / 2) * sinAngle + (rotatedHeight / 2) * cosAngle },

        { x: rotatedCenterX - (rotatedWidth / 2) * cosAngle - (rotatedHeight / 2) * sinAngle,

          y: rotatedCenterY - (rotatedWidth / 2) * sinAngle + (rotatedHeight / 2) * cosAngle },

        { x: rotatedCenterX - (rotatedWidth / 2) * cosAngle + (rotatedHeight / 2) * sinAngle,

          y: rotatedCenterY - (rotatedWidth / 2) * sinAngle - (rotatedHeight / 2) * cosAngle },

        { x: rotatedCenterX + (rotatedWidth / 2) * cosAngle + (rotatedHeight / 2) * sinAngle,

          y: rotatedCenterY + (rotatedWidth / 2) * sinAngle - (rotatedHeight / 2) * cosAngle }

    ];



    // Calculate the corners of the non-rotated rectangle

    const nonRotatedCorners = [

        { x: nonRotatedLeft, y: nonRotatedTop },

        { x: nonRotatedLeft + nonRotatedWidth, y: nonRotatedTop },

        { x: nonRotatedLeft + nonRotatedWidth, y: nonRotatedTop + nonRotatedHeight },

        { x: nonRotatedLeft, y: nonRotatedTop + nonRotatedHeight }

    ];



    // Function to project a shape onto an axis

    function project(axis, corners) {

        let min = Infinity;

        let max = -Infinity;

        for (const corner of corners) {

            const dot = corner.x * axis.x + corner.y * axis.y;

            min = Math.min(min, dot);

            max = Math.max(max, dot);

        }

        return { min, max };

    }



    // Function to check if two projections overlap

    function overlap(proj1, proj2) {

        return !(proj1.max < proj2.min || proj2.max < proj1.min);

    }



    // Get the axes to test (normals of the edges)

    const axes = [

        { x: cosAngle, y: sinAngle }, // Axis from rotated rectangle

        { x: -sinAngle, y: cosAngle }, // Axis from rotated rectangle

        { x: 1, y: 0 }, // Axis from non-rotated rectangle

        { x: 0, y: 1 }  // Axis from non-rotated rectangle

    ];



    // Check for overlap on all axes

    for (const axis of axes) {

        const proj1 = project(axis, rotatedCorners);

        const proj2 = project(axis, nonRotatedCorners);

        if (!overlap(proj1, proj2)) {

            return false; // No collision if any axis has no overlap

        }

    }



    return true; // Collision if all axes have overlap

}



function isCollidingSolid(obj1) {

    let objToCheck = [];

    for(let i = -1; i <= 1; i++) {

        for(let j = -1; j <= 1; j++) {

            objToCheck = objToCheck.concat(get(`inPos${parseInt(obj1.pos.x/CollisionTileSize)+i}/${parseInt(obj1.pos.y/CollisionTileSize)+j}`));

        }

    }

    let returnVal = false;

    objToCheck.forEach((obj2) => {

        if(obj2.is("solid") && areRectanglesColliding(obj1, obj2)) returnVal = true;

    })

    return returnVal;

}



function collidingList(obj1, rotated = false) {

    let returnVal = [];

    let objToCheck = [];

    for(let i = -1; i <= 1; i++) {

        for(let j = -1; j <= 1; j++) {

            objToCheck = objToCheck.concat(get(`inPos${parseInt(obj1.pos.x/CollisionTileSize)+i}/${parseInt(obj1.pos.y/CollisionTileSize)+j}`));

        }

    }

    objToCheck.forEach((obj2) => {

        if(!rotated) if(obj2.is("solid") && areRectanglesColliding(obj1, obj2)) returnVal.push(obj2);

        if(rotated) if(obj2.is("solid") && areRectanglesCollidingRotate(obj1, obj2)) returnVal.push(obj2);

    })

    return returnVal;

}



function collidingListGrappleLine(obj1, dir) {

    let pos;

    let inPosList = [];

    

    if(dir == "left") pos = {x: obj1.pos.x - obj1.w, y: obj1.pos.y - 2};

    if(dir == "right") pos = {x: obj1.pos.x, y: obj1.pos.y - 2};

    if(dir == "up") pos = {x: obj1.pos.x - 2, y: obj1.pos.y - obj1.h};

    if(dir == "down") pos = {x: obj1.pos.x - 2, y: obj1.pos.y};



    for(let posX = parseInt(pos.x/CollisionTileSize); posX <= parseInt((pos.x+obj1.w)/CollisionTileSize); posX++) {

        for(let posY = parseInt(pos.y/CollisionTileSize); posY <= parseInt((pos.y+obj1.h)/CollisionTileSize); posY++) {

            inPosList.push(`inPos${posX}/${posY}`);

        }

    }

    

    let returnVal = [];

    let objToCheck = [];

    

    inPosList.forEach(el => { objToCheck = objToCheck.concat(get(el)); })

    let auxObj = {

        pos: pos,

        w: obj1.w, h: obj1.h

    }

    objToCheck.forEach((obj2) => {

        if(obj2.is("solid") && areRectanglesColliding(auxObj, obj2)) returnVal.push(obj2);

        // if(obj2.is("solid") && areRectanglesColliding(auxObj, obj2)) obj2.destroy();

    })

    

    return returnVal;

}



function collidingListId(obj1) {

    let returnVal = [];

    let objToCheck = [];

    for(let i = -1; i <= 1; i++) {

        for(let j = -1; j <= 1; j++) {

            objToCheck = objToCheck.concat(get(`inPos${parseInt(obj1.pos.x/CollisionTileSize)+i}/${parseInt(obj1.pos.y/CollisionTileSize)+j}`));

        }

    }

    objToCheck.forEach((obj2) => {

        if(obj2.is("solid") && areRectanglesColliding(obj1, obj2)) returnVal.push(obj2.id);

    })

    return returnVal;

}



function addSolid(obj) {

    let o = add([

        rect(obj.width, obj.height),

        pos(obj.x, obj.y),

        area(),

        {

            w: obj.width,

            h: obj.height,

        },

        "solid"

    ])

    for(let posX = parseInt(obj.x/CollisionTileSize); posX <= parseInt((obj.x+obj.width)/CollisionTileSize); posX++) {

        for(let posY = parseInt(obj.y/CollisionTileSize); posY <= parseInt((obj.y+obj.height)/CollisionTileSize); posY++) {

            o.use(`inPos${posX}/${posY}`);

        }

    }

    return o;

}



function isGrounded(obj) {

    let beforeCollideId = collidingListId(obj);

    player.pos.y += 1;

    let afterCollideId = collidingListId(obj);

    let newCollisions = false;

    afterCollideId.forEach(o => {

        if(!beforeCollideId.includes(o)) {

            newCollisions = true;

        }

    })

    player.pos.y -= 1;

    return newCollisions;

}



function movePlayer() {

    let beforeCollideId = collidingListId(player);

    if(player.velY >= 0) {

        player.pos.y += player.velY;

        let afterCollideId = collidingListId(player);

        let afterCollide = collidingList(player);

        let newCollisions = [];

        afterCollideId.forEach(obj => {

            if(!beforeCollideId.includes(obj)) {

                newCollisions.push(obj);

            }

        })

        if(newCollisions.length > 0) player.velY = 0;

        afterCollide.forEach(obj => {

            if(newCollisions.includes(obj.id)) {

                player.pos.y = Math.min(player.pos.y, obj.pos.y - player.h);

            }

        })

    } else {

        player.pos.y += player.velY;

        let afterCollideId = collidingListId(player);

        let afterCollide = collidingList(player);

        let newCollisions = [];

        afterCollideId.forEach(obj => {

            if(!beforeCollideId.includes(obj)) {

                newCollisions.push(obj);

            }

        })

        if(newCollisions.length > 0) player.velY = 0;

        afterCollide.forEach(obj => {

            if(newCollisions.includes(obj.id)) {

                player.pos.y = Math.max(player.pos.y, obj.pos.y + obj.h);

            }

        })

    }



    if(player.velX >= 0) {

        player.pos.x += player.velX;

        let afterCollideId = collidingListId(player);

        let afterCollide = collidingList(player);

        let newCollisions = [];

        afterCollideId.forEach(obj => {

            if(!beforeCollideId.includes(obj)) {

                newCollisions.push(obj);

            }

        })

        if(newCollisions.length > 0) {

            player.velX = 0;

            movementVel = 0;

        }

        afterCollide.forEach(obj => {

            if(newCollisions.includes(obj.id)) {

                player.pos.x = Math.min(player.pos.x, obj.pos.x - player.w);

            }

        })

    } else {

        player.pos.x += player.velX;

        let afterCollideId = collidingListId(player);

        let afterCollide = collidingList(player);

        let newCollisions = [];

        afterCollideId.forEach(obj => {

            if(!beforeCollideId.includes(obj)) {

                newCollisions.push(obj);

            }

        })

        if(newCollisions.length > 0) {

            player.velX = 0;

            movementVel = 0;

        }

        afterCollide.forEach(obj => {

            if(newCollisions.includes(obj.id)) {

                player.pos.x = Math.max(player.pos.x, obj.pos.x + obj.w);

            }

        })

    }

}



addSolid({

    x: 400, y: 400,

    width: 300, height: 50

})

addSolid({
    x: 400, y: 100,
    width: 300, height: 25,
})

addSolid({

    x: 450, y: 360,

    width: 300, height: 50

})

addSolid({

    x: 500, y: 320,

    width: 300, height: 50

})

addSolid({

    x: 550, y: 280,

    width: 300, height: 50

})

addSolid({

    x: 0, y: 0,

    width: CollisionTileSize*3, height: CollisionTileSize*3

})

addSolid({

    x: CollisionTileSize*3, y: CollisionTileSize*3,

    width: CollisionTileSize*3, height: CollisionTileSize*3

})



// add([

//     rect(150, 50),

//     pos(400, 400),

//     area(),

//     {

//         w: 150,

//         h: 50,

//     },

//     "solid",

//     "inPos4/4",

//     "inPos5/4"

// ])



// let block = add([

//     rect(50, 100),

//     pos(500, 300),

//     area(),

//     "solid"

// ])



onKeyPress("up", () => {

    playerSpr.use(sprite("playerJump"));

    playerSpr.play("anim");

})

// onKeyPress("right", () => {

//     playerSpr.use(sprite("playerRun"));

//     playerSpr.play("anim");

// })

// onKeyPress("down", () => {

//     playerSpr.use(sprite("playerFall"));

//     playerSpr.play("anim");

// })

// onKeyPress("left", () => {

//     playerSpr.use(sprite("playerJump"));

//     playerSpr.play("anim");

// })



function flipPlayerSpr(flip) {

    let spr = playerSpr.sprite;

    debug.log(playerSpr.sprite);

    playerSpr.use(sprite(spr, {flipX: flip}));

    playerSpr.play("anim");

    playerSpr.face = flip;

}

// camScale(0.5);

flipPlayerSpr(true);

// Main Loop



let t = 0; // ticks



let grapple;

let grappleLine;



function addGrapple(dir) {

    console.log("ADD GRAPPLE");

    // if(typeof dir != "number") return ERRO;

    let o = add([

        sprite("grappleup"),

        pos(0, 0),

        anchor("center"),

        {

            w: 20, h: 12,

            distance: 0,

            dir: dir

        },

        "grapple"

    ])

    o.angle = dir/Math.PI*180;

    let centerPos = {

        x: player.pos.x + player.w/2,

        y: player.pos.y + player.h/2

    };

    let grapplePosX = centerPos.x + Math.sin(dir)*grappleOriginDist;

    let grapplePosY = centerPos.y - Math.cos(dir)*grappleOriginDist;



    o.pos.x = grapplePosX;

    o.pos.y = grapplePosY;



    return o;

}



function moveGrapple(checkCollision = true) {
    let originalPos = grapple.pos;
    let centerPos = {
        x: player.pos.x + player.w/2,
        y: player.pos.y + player.h/2
    };

    let grapplePosX = centerPos.x + Math.sin(grapple.dir)*grappleOriginDist*grapple.distance;
    let grapplePosY = centerPos.y - Math.cos(grapple.dir)*grappleOriginDist*grapple.distance;

    grapple.pos.x = grapplePosX;
    grapple.pos.y = grapplePosY;

    let colList = collidingList(grapple);

    if(colList.length > 1 && checkCollision) {
        // console.log(colList[0]);
        console.log(colList[0].pos.x, colList[0].pos.y);
        player.grappleState = 3;
        let newX, newY;

        // Roda uma vez antes p max e min funcionar
        if(grapple.angle == 0) grapple.pos.y = colList[0].pos.y + colList[0].h;
        if(grapple.angle == 90) grapple.pos.x = colList[0].pos.x;
        if(grapple.angle == 180) grapple.pos.y = colList[0].pos.y;
        if(grapple.angle == 270) grapple.pos.x = colList[0].pos.x + colList[0].w;
        
        if(grapple.angle == 45) newX = colList[0].pos.x, newY = colList[0].pos.y + colList[0].h;
        if(grapple.angle == 135) newX = colList[0].pos.x, newY = colList[0].pos.y;
        if(grapple.angle == 225) newX = colList[0].pos.x + colList[0].w, newY = colList[0].pos.y;
        if(grapple.angle == 315) newX = colList[0].pos.x + colList[0].w, newY = colList[0].pos.y + colList[0].h;

        colList.forEach(obj => {
            if(grapple.angle == 0) grapple.pos.y = Math.min(obj.pos.y + obj.h, grapple.pos.y);
            if(grapple.angle == 90) grapple.pos.x = Math.max(obj.pos.x, grapple.pos.x);
            if(grapple.angle == 180) grapple.pos.y = Math.max(obj.pos.y, grapple.pos.y);
            if(grapple.angle == 270) grapple.pos.x = Math.min(obj.pos.x + obj.w, grapple.pos.x);
            
            if(grapple.angle == 45) newX = Math.max(obj.pos.x, newX), newY = Math.min(obj.pos.y + obj.h, newY);
            if(grapple.angle == 135) newX = Math.max(obj.pos.x, newX), newY = Math.max(obj.pos.y, newY);
            if(grapple.angle == 225) newX = Math.min(obj.pos.x + obj.w, newX), newY = Math.max(obj.pos.y, newY);
            if(grapple.angle == 315) newX = Math.min(obj.pos.x + obj.w, newX), newY = Math.min(obj.pos.y + obj.h, newY);
        })
        
        // let mv = Math.min(Math.abs(grapple.pos.x - newX), Math.abs(grapple.pos.y - newY));
        let mv = (Math.abs(grapple.pos.x - newX) < Math.abs(grapple.pos.y - newY)) ? newX - originalPos.x : newY - originalPos.y;
        console.log(grapple.pos, newX, newY, mv);
        console.log(grapple.pos.x - newX, grapple.pos.y - newY);
        if(grapple.angle == 45) grapple.pos.x = originalPos.x + mv, grapple.pos.y = originalPos.y + mv;
        if(grapple.angle == 135) grapple.pos.x = originalPos.x + mv, grapple.pos.y = originalPos.y + mv;
        if(grapple.angle == 225) grapple.pos.x = originalPos.x + mv, grapple.pos.y = originalPos.y + mv;
        if(grapple.angle == 315) grapple.pos.x = originalPos.x + mv, grapple.pos.y = originalPos.y + mv;
    }

}



// function addGrappleLine(dir) {

//     let o = add([

//         rect(4, 4),

//         pos(0, 0),

//         {

//             w: 4, h: 4,

//         },

//         "grappleLine"

//     ])

//     if(dir == "up") {

//         o.pos.x = player.pos.x + (player.w)/2;

//         o.pos.y = player.pos.y;

//         o.use(anchor("bot"));

//     }

//     if(dir == "down") {

//         o.pos.x = player.pos.x + (player.w)/2;

//         o.pos.y = player.pos.y + player.h;

//         o.use(anchor("top"));

//     }

//     if(dir == "left") {

//         o.pos.y = player.pos.y + (player.h)/2;

//         o.pos.x = player.pos.x;

//         o.use(anchor("right"));

//     }

//     if(dir == "right") {

//         o.pos.y = player.pos.y + (player.h)/2;

//         o.pos.x = player.pos.x + player.w;

//         o.use(anchor("left"));

//     }

//     return o;

// }



// function updateGrappleSprite(grappleLineObj, dir) {

//     let position = grappleLineObj.pos;

//     let spr = "grappleline"+dir;

    

// }



loop(0.01, async() => {

    if(player.pos.y > 600) player.pos.y = 0;

    t++;



    // Gravity

    if(t%2 == 0 && player.grappleState <= 2) player.velY = Math.min(player.velY + 2, 36);



    // Control handelling

    if(t%2 == 0) {

        if(isKeyDown("x") && player.grappleState == 0) {

            player.grappleState = 1; // lançando

            if(isKeyDown("up")) {

                if(isKeyDown("right")) player.grappleDirection = Math.PI*1/4;

                else if(isKeyDown("left")) player.grappleDirection = Math.PI*7/4;

                else player.grappleDirection = Math.PI*0;

            }

            else if(isKeyDown("down")) {

                if(isKeyDown("right")) player.grappleDirection = Math.PI*3/4;

                else if(isKeyDown("left")) player.grappleDirection = Math.PI*5/4;

                else player.grappleDirection = Math.PI*1

            }

            else if(playerSpr.face == 0) player.grappleDirection = Math.PI*1/2;

            else player.grappleDirection = Math.PI*3/2;



            grapple = addGrapple(player.grappleDirection);

            // grappleLine = addGrappleLine(player.grappleDirection);

        }

        if(!isKeyDown("x") && (player.grappleState == 1 || player.grappleState == 3)) { //lançando ou fixado

            player.grappleState = 2; // voltando
            grapple.distance = Math.sqrt((player.pos.x+player.w/2 - grapple.pos.x)*(player.pos.x+player.w/2 - grapple.pos.x) + (player.pos.y+player.h/2 - grapple.pos.y)*(player.pos.y+player.h/2 - grapple.pos.y))/grappleOriginDist;
            console.log((player.pos.x+player.w/2 - grapple.pos.x)*(player.pos.x+player.w/2 - grapple.pos.x) + (player.pos.y+player.h/2 - grapple.pos.y)*(player.pos.y+player.h/2 - grapple.pos.y));
            // console.log((player.pos.x+player.w/2 - grapple.pos.x)^2);
            console.log(grapple.distance);
        }

        if(!isKeyDown("x") && player.grappleState == 4) { //player fixado

            if(player.grappleDirection == "up") {

                if(isKeyDown("right")) player.velX += GrappleSpeedBoost;

                if(isKeyDown("left")) player.velX -= GrappleSpeedBoost;

                if(isKeyDown("right") || isKeyDown("left") || isKeyDown("down")) player.velY += GrappleSpeedBoost;

            }

            if(player.grappleDirection == "down") {

                if(isKeyDown("right")) player.velX += GrappleSpeedBoost;

                if(isKeyDown("left")) player.velX -= GrappleSpeedBoost;

                if(isKeyDown("right") || isKeyDown("left") || isKeyDown("up")) player.velY -= GrappleSpeedBoost;

            }

            if(player.grappleDirection == "left") {

                if(isKeyDown("down")) player.velY += GrappleSpeedBoost;

                if(isKeyDown("up")) player.velY -= GrappleSpeedBoost;

                if(isKeyDown("up") || isKeyDown("down") || isKeyDown("right")) player.velX += GrappleSpeedBoost;

            }

            if(player.grappleDirection == "right") {

                if(isKeyDown("down")) player.velY += GrappleSpeedBoost;

                if(isKeyDown("up")) player.velY -= GrappleSpeedBoost;

                if(isKeyDown("up") || isKeyDown("down") || isKeyDown("left")) player.velX -= GrappleSpeedBoost;

            }



            grapple.destroy();

            player.grappleState = 0; // nada

        }



        /**TODO LIST:

         * Retângulo entre o grapple e o personagem

         * Ungrappable

         */

        

        if(isKeyDown("i")) player.velX = GrappleVel;

        if(isKeyDown("u")) player.velX = -GrappleVel;



        // Lower velocity

        if(player.grappleState <= 2) {

            if(isGrounded(player)) {

                if(Math.abs(player.velX) < 2) player.velX = 0;

                else player.velX = (player.velX * 0.75);

            } else {

                if(Math.abs(player.velX) < 2) player.velX = 0;

                else player.velX = (player.velX * 0.95);

            }

        }



        if(player.grappleState <= 2) {
            if(isGrounded(player)) {
                if(isKeyDown("z")) player.velY -= 15;
            }

            moveVelX = 0;

            if(isKeyDown("left")) moveVelX -= 6;
            if(isKeyDown("right")) moveVelX += 6;

            if(player.velX > -6 && moveVelX == -6) player.velX = Math.max(player.velX + moveVelX, -6);
            if(player.velX < 6 && moveVelX == 6) player.velX = Math.min(player.velX + moveVelX, 6);
            if(moveVelX != 0 && ((moveVelX < 0) != playerSpr.face)) flipPlayerSpr(moveVelX < 0);
        }

        if(isKeyDown("k")) player.pos.y = 0;
        if(isKeyDown("k")) player.velY = 0;
        if(isKeyDown("k")) player.pos.x = 400;
        if(isKeyDown("k")) player.velX = 0;
    }

    if(t%2 == 0) {
        if(player.grappleState == 1) {
            grapple.distance += 3.6;
            moveGrapple();
        }

        if(player.grappleState == 2) {
            grapple.distance -= 3.6;
            moveGrapple(false);

            if(grapple.distance <= 0) {
                grapple.destroy();
                player.grappleState = 0;
                // grappleLine.destroy();
            }
        }
    }

    // Collision for player movements

    if(t%2 == 0) {
        movePlayer();
        if(player.grappleState == 3) {
            player.velX = 0; player.velY = 0; player.moveVelX = 0;
            
            if(areRectanglesCollidingRotate(grapple, player)) {
                player.grappleState = 4;
            }
            else {
                let p;
                if(grapple.angle == 0) p = {x: player.pos.x + player.w/2, y: player.pos.y};
                if(grapple.angle == 45) p = {x: player.pos.x + player.w, y: player.pos.y};
                if(grapple.angle == 90) p = {x: player.pos.x + player.w, y: player.pos.y + player.h/2};
                if(grapple.angle == 135) p = {x: player.pos.x + player.w, y: player.pos.y + player.h};
                if(grapple.angle == 180) p = {x: player.pos.x + player.w/2, y: player.pos.y + player.h};
                if(grapple.angle == 225) p = {x: player.pos.x, y: player.pos.y + player.h};
                if(grapple.angle == 270) p = {x: player.pos.x, y: player.pos.y + player.h/2};
                if(grapple.angle == 315) p = {x: player.pos.x, y: player.pos.y};
                let angulo = Math.atan2(grapple.pos.x - p.x, p.y - grapple.pos.y);
                player.velX = 36*Math.sin(angulo);
                player.velY = -36*Math.cos(angulo);
            }
        }
        if(player.grappleState == 4) {
            if(grapple.angle == 45) player.pos.x = grapple.pos.x - player.w, player.pos.y = grapple.pos.y;
            if(grapple.angle == 135) player.pos.x = grapple.pos.x - player.w, player.pos.y = grapple.pos.y - player.h;
            if(grapple.angle == 225) player.pos.x = grapple.pos.x, player.pos.y = grapple.pos.y - player.h;
            if(grapple.angle == 315) player.pos.x = grapple.pos.x, player.pos.y = grapple.pos.y;
        }
    }

    

    if(true) {

        // let the player sprite follow the player with offset

        playerSpr.pos.x = player.pos.x - 10;

        playerSpr.pos.y = player.pos.y - 25;

    }

})
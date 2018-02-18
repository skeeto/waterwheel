"use strict";

function waterwheel(n) {
    let r = Math.random() * Math.PI * 2;
    let v = Math.random() - 0.5;
    return {
        nbuckets: n,
        damping:  2.5,  // coefficient of damping for wheel (ft*lbs/rad/sec)
        inertia:  0.1,  // moment of inertia of empty wheel (slug*ft^2)
        drain:    0.3,  // drain rate per cup (slug/sec/slug)
        fillrate: 0.33, // fill rate per cup (slugs/sec)
        gravity:  32.2, // acceleration due to gravity (ft/sec^2)
        radius:   1.0,  // radius of wheel (ft)
        rotation: r,    // position of cup 0 (rad)
        velocity: v,    // angular velocity (rad/s)
        buckets: new Float64Array(n)
    };
}

function derive(wheel) {
    // moment of inertia: sum of contributions from each cup
    let inertia = 0;
    for (let i = 0; i < wheel.nbuckets; i++)
        inertia += wheel.buckets[i];
    inertia = inertia * wheel.radius * wheel.radius + wheel.inertia;

    // torque contribution from each cup
    let torque = -wheel.damping * wheel.velocity;
    let rg = wheel.radius * wheel.gravity;
    for (let i = 0; i < wheel.nbuckets; i++) {
        let r = wheel.rotation + i * 2 * Math.PI / wheel.nbuckets;
        torque += rg * wheel.buckets[i] * Math.sin(r);
    }
    // compute drain and spigot for each cup
    let bdot = new Float64Array(wheel.nbuckets);
    let f = wheel.fillrate / 2;
    for (let i = 0; i < wheel.nbuckets; i++) {
        let r = wheel.rotation + i * 2 * Math.PI / wheel.nbuckets;
        bdot[i] = -wheel.drain * wheel.buckets[i];
        if (Math.cos(r) > Math.abs(Math.cos(2 * Math.PI / wheel.nbuckets))) {
            let x = Math.atan2(Math.tan(r), 1);
            bdot[i] += f * (Math.cos(wheel.nbuckets * x / 2) + 1);
        }
    }

    return {
        rdot: wheel.velocity,
        vdot: torque / inertia,
        bdot: bdot
    };
}

function clone(wheel) {
    let dup = Object.assign({}, wheel);
    dup.buckets = wheel.buckets.slice();
    return dup;
}

function apply(wheel, wdot, dt) {
    wheel.rotation += wdot.rdot * dt;
    wheel.velocity += wdot.vdot * dt;
    for (let i = 0; i < wheel.nbuckets; i++)
        wheel.buckets[i] += wdot.bdot[i] * dt;
    return wheel;
}

function rk4(k1, dt) {
    let k1d = derive(k1);
    let k2  = apply(clone(k1), k1d, dt / 2);
    let k2d = derive(k2);
    let k3  = apply(clone(k1), k2d, dt / 2);
    let k3d = derive(k3);
    let k4  = apply(clone(k1), k3d, dt);
    let k4d = derive(k4);

    let dot = k1d;
    dot.rdot += 2 * k2d.rdot + 2 * k3d.rdot + k4d.rdot;
    dot.vdot += 2 * k2d.vdot + 2 * k3d.vdot + k4d.vdot;
    for (let i = 0; i < k1.nbuckets; i++)
        dot.bdot[i] += 2 * k2d.bdot[i] + 2 * k3d.bdot[i] + k4d.bdot[i];
    return apply(k1, dot, dt / 6);
}

function draw(ctx, wheel) {
    let w = ctx.canvas.width;
    let h = ctx.canvas.height;
    let z = Math.min(w, h) / 2;

    ctx.fillStyle = '#ffd';
    ctx.fillRect(0, 0, w, h);

    let wscale = 0.8;
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, wscale * z, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    let bscale = z * 3 / wheel.nbuckets;
    let bmax = 0.4;
    for (let i = 0; i < wheel.nbuckets; i++) {
        let v = Math.min(bmax, wheel.buckets[i]);
        let r = wheel.rotation + i * 2 * Math.PI / wheel.nbuckets;
        let x = +Math.sin(r) * z * wscale + w / 2;
        let y = -Math.cos(r) * z * wscale + h / 2;
        let x0 = x - bscale / 2;
        let y0 = y - bscale / 2;
        let fill = (v / bmax) * bscale;
        ctx.fillStyle = '#fff';
        ctx.fillRect(x0, y0, bscale, bscale);
        ctx.fillStyle = '#28e';
        ctx.fillRect(x0, y0 + bscale - fill, bscale, fill);
        ctx.strokeRect(x0, y0, bscale, bscale);
    }
}


document.addEventListener('DOMContentLoaded', function() {
    let dtMax = 30 / 1000;
    let ctx = document.getElementById('waterwheel').getContext('2d');
    let wheel = waterwheel(17);

    let last = 0;
    function cb(t) {
        let dt = Math.min((t - last) / 1000 / 2, dtMax);
        last = t;
        wheel = rk4(wheel, dt);
        ctx.canvas.width = window.innerWidth;
        ctx.canvas.height = window.innerHeight;
        draw(ctx, wheel);
        window.requestAnimationFrame(cb);
    }
    window.requestAnimationFrame(cb);
});

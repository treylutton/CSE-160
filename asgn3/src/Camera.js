class Camera {
    constructor() {
        this.fov         = 60.0;
        this.eye         = new Vector3([-5,.5,-10]);
        this.at          = new Vector3([0,.5,0]);
        this.up          = new Vector3([0,1,0]);
        this.view_matrix = new Matrix4(); // identity
        this.proj_matrix = new Matrix4(); // identity

        this.view_matrix.setLookAt(this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
                                   this.at.elements[0],  this.at.elements[1],  this.at.elements[2],
                                   this.up.elements[0],  this.up.elements[1],  this.up.elements[2]);

        this.proj_matrix.setPerspective(this.fov, canvas.width/canvas.height, 0.1, 1000);
    }

    update_view_matrix() {
        this.view_matrix.setLookAt(this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
                                   this.at.elements[0],  this.at.elements[1],  this.at.elements[2],
                                   this.up.elements[0],  this.up.elements[1],  this.up.elements[2]);
    }

    // returns true if world position (x, z) is inside a wall cell
    is_wall(x, z) {
        // g_map is shifted from [-16, 15] to [0,31]
        // convert and take floor to get the map index the
        // camera point is currently on.
        var x_idx = Math.floor(x + 16);
        var z_idx = Math.floor(z + 16);

        // convert to 1D array index and return if that cell is empty
        return (g_map[x_idx * 32 + z_idx] > 0);
    }

    // calculates X and Z axis collisions independently.
    // checks if the x or z components of the scaled
    // forward vector intersect a cube
    apply_move(dx, dz) {
        if (!this.is_wall(this.eye.elements[0] + dx, this.eye.elements[2])) {
            this.eye.elements[0] += dx;
            this.at.elements[0]  += dx;
        }
        if (!this.is_wall(this.eye.elements[0], this.eye.elements[2] + dz)) {
            this.eye.elements[2] += dz;
            this.at.elements[2]  += dz;
        }
        this.update_view_matrix();
    }

    move_forward() {
        // f = at - eye
        var f = new Vector3([0,0,0]);
        f.set(this.at);
        f.sub(this.eye);

        // set magnitude to speed
        f.normalize();
        f.mul(g_playerSpeed);

        // collision check helper (tests move first)
        this.apply_move(f.elements[0], f.elements[2]);
    }

    move_backward() {
        // b = -1 * f = eye - at
        var b = new Vector3([0,0,0]);
        b.set(this.eye);
        b.sub(this.at);

        // set magnitude to speed
        b.normalize();
        b.mul(g_playerSpeed);

         // collision check helper (tests move first)
        this.apply_move(b.elements[0], b.elements[2]);
    }

    move_left() {
        // f = at - eye
        var f = new Vector3([0,0,0]);
        f.set(this.at);
        f.sub(this.eye);

        // l = up x f
        var l = Vector3.cross(this.up, f);

        // set magnitude of l to speed
        l.normalize();
        l.mul(g_playerSpeed);

         // collision check helper (tests move first) 
        this.apply_move(l.elements[0], l.elements[2]);
    }

    move_right() {
        // f = at - eye
        var f = new Vector3([0,0,0]);
        f.set(this.at);
        f.sub(this.eye);

        // r = - (up x f)
        var r = Vector3.cross(this.up, f);

        // set magnitude of l to speed
        r.normalize();
        r.mul(-1.0 * g_playerSpeed);

         // collision check helper (tests move first)
        this.apply_move(r.elements[0], r.elements[2]);
    }

    pan_left() {
        // f = at - eye
        var f = new Vector3([0,0,0]);
        f.set(this.at);
        f.sub(this.eye);

        // rotation matrix
        var rot = new Matrix4();
        rot.setRotate((g_mouse_sens * 10.0), this.up.elements[0], this.up.elements[1], this.up.elements[2]);

        // f' = rot * f (matrix multiply)
        var f_prime = rot.multiplyVector3(f);

        // move camera direction
        this.at = new Vector3([this.eye.elements[0] + f_prime.elements[0],
                               this.eye.elements[1] + f_prime.elements[1],
                               this.eye.elements[2] + f_prime.elements[2]]);
        this.update_view_matrix();
    }

    pan_right() {
        // f = at - eye
        var f = new Vector3([0,0,0]);
        f.set(this.at);
        f.sub(this.eye);

        // rotation matrix
        var rot = new Matrix4();
        rot.setRotate(-1 * (g_mouse_sens * 10.0), this.up.elements[0], this.up.elements[1], this.up.elements[2]);

        // f' = rot * f (matrix multiply)
        var f_prime = rot.multiplyVector3(f);

        // move camera direction
        this.at = new Vector3([this.eye.elements[0] + f_prime.elements[0],
                               this.eye.elements[1] + f_prime.elements[1],
                               this.eye.elements[2] + f_prime.elements[2]]);
        this.update_view_matrix();
    }

    pan_mouse(dx, dy) {
        // YAW 

        // f = at - eye
        var f = new Vector3([0,0,0]);
        f.set(this.at);
        f.sub(this.eye);

        // rot -dx degrees (so right mouse movement turns right)
        // center of rotation: up vector 
        var yaw = new Matrix4();
        yaw.setRotate(-dx, this.up.elements[0], this.up.elements[1], this.up.elements[2]);

        // f' = yaw * f (matrix multiply)
        var f1 = yaw.multiplyVector3(f);

        // move camera direction
        this.at = new Vector3([this.eye.elements[0] + f1.elements[0],
                               this.eye.elements[1] + f1.elements[1],
                               this.eye.elements[2] + f1.elements[2]]);
        // PITCH

        // r = f' x up (orthogonal to *updated* forward vector and up vector)
        var r = Vector3.cross(f1, this.up);
        r.normalize();

        // rot dy degrees ( dy > 0 = counter clockwise rotation about right vector = up)
        // NOTE: invert dy because we no longer convert coords from event to webgl
        var pitch = new Matrix4();
        pitch.setRotate(-dy, r.elements[0], r.elements[1], r.elements[2]);

        // f'' = pitch * f' (matrix multiply)
        var f2 = pitch.multiplyVector3(f1);

        // only set at if pitch is not vertical 
        if (Math.abs(f2.elements[1] / f2.magnitude()) < 0.995) {
            this.at = new Vector3([this.eye.elements[0] + f2.elements[0],
                                   this.eye.elements[1] + f2.elements[1],
                                   this.eye.elements[2] + f2.elements[2]]);
        }

        this.update_view_matrix();
    } 
}
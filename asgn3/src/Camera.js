class Camera {
    constructor() {
        this.fov         = 60.0;
        this.eye         = new Vector3([0,.5,-2]);
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

    move_forward() {
        // f = at - eye
        var f = new Vector3([0,0,0]);
        f.set(this.at);
        f.sub(this.eye);

        // set magnitude to speed
        f.normalize();
        f.mul(g_playerSpeed);

        // move camera pos & direction
        this.at.add(f);
        this.eye.add(f);
        this.update_view_matrix();
    }

    move_backward() {
        // b = -1 * f = eye - at
        var b = new Vector3([0,0,0]);
        b.set(this.eye);
        b.sub(this.at);

        // set magnitude to speed
        b.normalize();
        b.mul(g_playerSpeed);

        // move camera pos & direction
        this.at.add(b);
        this.eye.add(b);
        this.update_view_matrix();
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

        // move camera pos & direction
        this.at.add(l);
        this.eye.add(l);
        this.update_view_matrix();
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

        // move camera pos & direction
        this.at.add(r);
        this.eye.add(r);
        this.update_view_matrix();
    }

    pan_left() {
        // f = at - eye
        var f = new Vector3([0,0,0]);
        f.set(this.at);
        f.sub(this.eye);

        // rotation matrix
        var rot = new Matrix4();
        rot.setRotate(g_cam_rot_increment, this.up.elements[0], this.up.elements[1], this.up.elements[2]);

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
        rot.setRotate(-1 * g_cam_rot_increment, this.up.elements[0], this.up.elements[1], this.up.elements[2]);

        // f' = rot * f (matrix multiply)
        var f_prime = rot.multiplyVector3(f);

        // move camera direction
        this.at = new Vector3([this.eye.elements[0] + f_prime.elements[0],
                               this.eye.elements[1] + f_prime.elements[1],
                               this.eye.elements[2] + f_prime.elements[2]]);
        this.update_view_matrix();
    }
}
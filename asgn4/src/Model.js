class Model {
    constructor(gl, filePath) {
        this.filePath = filePath;
        this.color = [1,1,1,1];
        this.matrix = new Matrix4();
        this.isFullyLoaded = false;
        this.getFileContent().then(() => {
            this.vertexBuffer = gl.createBuffer();
            this.normalBuffer = gl.createBuffer();

            if (!this.vertexBuffer || !this.normalBuffer) {
                console.log("Failed to create buffers for", this.filePath);
                return;
            }
        })
    }

    async parseModel(fileContent) {
        const lines = fileContent.split("\n");
        const allv = [];
        const alln = [];
        const unpv = [];
        const unpn = [];
        for(let i=0;i<lines.length;i++){
            const line = lines[i];
            const tokens = line.split(" ");

            if (tokens[0] == "v") {
                allv.push(parseFloat(tokens[1]),parseFloat(tokens[2]),parseFloat(tokens[3]));
            } else if (tokens[0] == "vn") {
                alln.push(parseFloat(tokens[1]),parseFloat(tokens[2]),parseFloat(tokens[3]));
            } else if (tokens[0] == "f") {
                for (const face of [tokens[1], tokens[2], tokens[3]]) {
                    const indices = face.split("/");
                    const vertexIndex = (parseInt(indices[0]) - 1) * 3;
                    const normalIndex = (parseInt(indices[2]) - 1) * 3;
            

                    unpv.push(allv[vertexIndex],
                          allv[vertexIndex + 1],
                          allv[vertexIndex + 2]);

                    unpn.push(alln[normalIndex],
                          alln[normalIndex + 1],
                          alln[normalIndex + 2]);
                }
            }
        }

        this.modelData = {
            vertices: new Float32Array(unpv),
            normals: new Float32Array(unpn),
        };
        this.isFullyLoaded = true;
    }

    render() {
        if (!this.isFullyLoaded) return;
        gl.uniform1i(u_lighting_enabled, 1);
        gl.uniform1i(u_tex_enum, -2);
        //vert
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.modelData.vertices, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        //normalsB
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.modelData.normals, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Normal);

        // set uniforms
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
        gl.uniform4fv(u_FragColor, this.color);

        // normal matrix
        let normalMatrix = new Matrix4().setInverseOf(this.matrix);
        normalMatrix.transpose();
        gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

        gl.drawArrays(gl.TRIANGLES, 0, this.modelData.vertices.length / 3);
    }

    async getFileContent() {
        try {
            const response = await fetch(this.filePath);
            if (!response.ok) throw new Error(`Could not load file "${this.filePath}". Are you sure the file name/path are correct?`);

            const fileContent = await response.text();
            this.parseModel(fileContent);
        } catch (e) {
            throw new Error(`Something went wrong when loading ${this.filePath}. Error: ${e}`);
        }
    }
}

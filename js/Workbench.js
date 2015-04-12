(function () {
    var Workbench = function (world, scene, leapController) {
        this.world = world;
        this.scene = scene;
        this.actuators = [];
        this.bodyActuatorMap = {};
        this.addActuator('blue', new CANNON.Vec3(0.1, 0, 0));
        this.addActuator('red', new CANNON.Vec3(-0.1, 0, 0));

        // world.addConstraint(actuator_a.addTopActuator(actuator_b));

        this.leapController = leapController;
        this.leapController.on('frame', this.interact.bind(this));
    };

    Workbench.prototype.addActuator = function (color, position) {
        var actuator = new Actuator({
            amplitude: 0,
            position: position,
            color: color
        });
        this.world.add(actuator.body);
        actuator.mesh.add(new THREE.AxisHelper(0.08));
        this.scene.add(actuator.mesh);
        this.actuators.push(actuator);
        this.bodyActuatorMap[actuator.body.id] = actuator;
        actuator.body.addEventListener('collide', this.joinActuators.bind(this));
    };

    Workbench.prototype.joinActuators = function (event) {
        var target = this.bodyActuatorMap[event.target.id];
        var body = this.bodyActuatorMap[event.body.id];
        if (target.isJoinedTo(body)) { return; }
        this.world.addConstraint(body.addTopActuator(target));
    };

    Workbench.prototype.getClosestActuator = function (position) {
        var closest;
        var closestDistance;
        this.actuators.forEach(function (actuator) {
            var currentDistance = position.distanceTo(actuator.body.position);
            if (!closest || currentDistance < closestDistance) {
                closest = actuator;
                closestDistance = currentDistance;
            }
        });
        return closest;
    };

    var getMatrixFromArray = function (arr) {
        var matrix = new THREE.Matrix4();
        matrix.set(
            arr[0], arr[1], arr[2], 0,
            arr[4], arr[5], arr[6], 0,
            arr[8], arr[9], arr[10], 0,
            0, 0, 0, 0
        );
        return matrix;
    };

    var ROTATION_OFFSET = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1), -Math.PI / 2);
    Workbench.prototype.getPalmQuaternion = function (hand) {
        var quaternion = new THREE.Quaternion().setFromRotationMatrix(
            getMatrixFromArray(hand.indexFinger.metacarpal.matrix()));
        quaternion.inverse();
        quaternion.multiply(ROTATION_OFFSET);
        return quaternion;
    };

    var POSITION_OFFSET = new THREE.Vector3(0.015, -0.005, -0.01);
    var GRAB_THRESHOLD = 0.8;
    Workbench.prototype.interact = function (frame) {
        if (frame.hands.length === 0) { return; }
        var hand = frame.hands[0];

        var palmPosition = new THREE.Vector3().fromArray(hand.palmPosition);

        if (!this.currentActuator && hand.grabStrength > GRAB_THRESHOLD) {
            var closestActuator = this.getClosestActuator(palmPosition);
            this.currentActuator = closestActuator;
        }

        if (hand.grabStrength <= GRAB_THRESHOLD) {
            this.currentActuator = null;
        }

        if (this.currentActuator) {
            var palmQuaternion = this.getPalmQuaternion(hand);
            this.currentActuator.body.quaternion.copy(palmQuaternion);
            palmPosition.add(POSITION_OFFSET.clone().applyQuaternion(palmQuaternion));
            this.currentActuator.body.position.copy(palmPosition);
        }
    };


    Workbench.prototype.update = function (elapsed) {
        this.actuators.forEach(function (actuator) {
            actuator.step(elapsed);
        });
    };
    window.Workbench = Workbench;
}());
// JavaScript source code
angular.module('ballhitLab', [])
.factory('svg', ['$window', function ($window) {
    var svg = new Snap("#svg-paper");
    svg.domEl = $window.document.getElementById("svg-paper");
    svg.cY = function (y) {
        return y - this.domEl.getBoundingClientRect().top;
    };
    svg.cX = function (x) {
        return x - this.domEl.getBoundingClientRect().left;
    };
    return svg;
}])
.factory('Ball', ['svg', '$rootScope', function (svg, $rootScope) {

    var onDrag = function (ball, dx, dy, x, y) {
        if ($rootScope.ballsLocked) {
            return;
        }

        ball.setPos({ cx: svg.cX(x), cy: svg.cY(y)});
    };

    var onBeginDrag = function (ball) {
        if ($rootScope.ballsLocked) {
            return;
        }

        $rootScope.$emit('ballBeginDrag', ball);
    };

    var onEndDrag = function (ball) {
        if ($rootScope.ballsLocked) {
            return;
        }

        $rootScope.$emit('ballEndDrag', ball);
    };

    var placticFill = svg.gradient('r(0.3, 0.3, 0.5)#600-#644');
    var metalFill = svg.gradient('r(0.3, 0.3, 0.5)#ccc-#444');

    var Ball = function (m, r, isMetal, cx, cy) {
        this.m = m;
        this.r = r;
        this.isMetal = isMetal;
        this.element = svg.circle(0, 0, r).attr({ fill: isMetal ? metalFill : placticFill });
        this.home = { cx: cx, cy: cy };
        this.pos = { cx: cx, cy: cy };
        this.setPos(this.pos);
        this.element.drag(onDrag.bind(window, this), onBeginDrag.bind(window, this), onEndDrag.bind(window, this));
    };

    Ball.prototype.isMetal = function () {
        return this.isMetal;
    };

    Ball.prototype.isPlasticine = function () {
        return !this.isMetal;
    };

    Ball.prototype.setPos = function (pos) {
        this.pos.cx = pos.cx || this.pos.cx;
        this.pos.cy = pos.cy || this.pos.cy;
        this.element.attr(this.pos);
    };

    Ball.prototype.isNearPoint = function (x, y, r) {
        return (Math.abs(this.pos.cx - x) < r) && (Math.abs(this.pos.cy - y) < r);
    };

    
    return Ball;
}])
.factory('geometryHelper', ['svg', function (svg) {
    return {
        drawRect: function (left, top, width, height) {
            var standAttr = { fill: svg.gradient('l(0,0,0,1)rgb(9, 175, 255)-rgb(0, 100, 255)'), stroke: '#000000', strokeWidth: 1 };
            var rect = svg.rect(left, top, width, height).attr(standAttr).transform('t 0.5, 0.5');
            return rect;
        },

        drawLine: function (fromX, fromY, toX, toY, w) {
            var lineStyle = { stroke: '#000000', strokeWidth: (w || 2) };
            return svg.line(fromX, fromY, toX, toY).attr(lineStyle);
        },

        drawTri: function (x, y) {
            return svg.polygon(x - 5, y, x + 5, y, x, y + 15).attr({ fill: "black", stroke: "black" }).transform('t 0, 0.5');
        }
    }
}])
.factory('PendulumSystem', ['svg', 'geometryHelper', '$rootScope', function (svg, gh, $rootScope) {
    var PendulumSystem = function (center, len, dist) {
        this.center = center;
        this.len = len;
        this.l = 0.5;
        this.dist = dist;

        this.leftLine = gh.drawLine(center.x - this.dist, center.y, center.x - this.dist, center.y + len, 1);
        this.leftTri = gh.drawTri(center.x - this.dist, center.y + len);
        this.rightLine = gh.drawLine(center.x + this.dist, center.y, center.x + this.dist, center.y + len, 1);
        this.rightTri = gh.drawTri(center.x + this.dist, center.y + len);

        this.leftPendulum = svg.group(this.leftLine, this.leftTri);
        this.rightPendulum = svg.group(this.rightLine, this.rightTri);
        this.rightAngle = this.leftAngle = 0;
        this.rightBall = this.leftBall = null;

        var self = this;
        this.rightTri.drag(function (dx, dy, x, y) {
            if (!(self.leftBall && self.rightBall)) {
                return;
            }

            if ($rootScope.inSimulation) {
                return;
            }

            var cx = svg.cX(x) - (center.x + self.dist);
            var cy = svg.cY(y) - center.y;
            var ry = cy / Math.sqrt(cx * cx + cy * cy);

            var a = 90 - (Math.asin(ry) * 180 / Math.PI);
            if (a < 0) {
                a = 0;
            }
            if (a > 90) {
                a = 90;
            }
            self.setRightAngle(a);

            $rootScope.ballsLocked = true;
        });
    };


    PendulumSystem.prototype.isMetal = function () {
        return this.leftBall.isMetal && this.rightBall.isMetal;
    };

    PendulumSystem.prototype.setLeftAngle = function (a) {
        this.leftAngle = a;
        var str = 'r' + a + ' ' + (this.center.x - this.dist) + ' ' + this.center.y;
        this.leftPendulum.transform(str);
        if (this.leftBall) {
            this.leftBall.element.transform(str);
        }
    };

    PendulumSystem.prototype.setRightAngle = function (a) {
        this.rightAngle = a;
        var str = 'r' + (-a) + ' ' + (this.center.x + this.dist) + ' ' + this.center.y;
        this.rightPendulum.transform(str);
        if (this.rightBall) {
            this.rightBall.element.transform(str);
        }
    };

    PendulumSystem.prototype.getLeftPos = function () {
        return { cx: this.center.x - this.dist, cy: this.center.y + this.len};
    };

    PendulumSystem.prototype.getRightPos = function () {
        return { cx: this.center.x + this.dist, cy: this.center.y + this.len };
    };

    PendulumSystem.prototype.setLeftBall = function (ball) {
        if (this.leftBall) {
            this.leftBall.element.transform('');
            this.leftBall.setPos(this.leftBall.home);
        }

        ball.setPos(this.getLeftPos());
        this.leftBall = ball;
    };

    PendulumSystem.prototype.setRightBall = function (ball) {
        if (this.rightBall) {
            this.rightBall.element.transform('');
            this.rightBall.setPos(this.rightBall.home);
        }

        ball.setPos(this.getRightPos());
        this.rightBall = ball;
    };


    return PendulumSystem;
}])
.factory('Simulation', ['$rootScope', function ($rootScope) {

    var g = 9.8;

    var cos = function (deg) {
        return Math.cos(Math.PI * deg / 180);
    }

    var getSpeed = function (a, E, l, m) {
        return Math.sqrt(2 * ((E / m) - g * l * (1 - cos(a))));
    }

    var getMaxAngle = function (E, l, m) {
        var ca = 1 - (E / (m * g * l));
        var a = 180 * Math.acos(ca) / Math.PI;
        return a;
    };

    var beforeHitSimulationStep = function (system, E, da) {
        if (!$rootScope.inSimulation) {
            return;
        }

        var a = system.rightAngle - da;

        if (a < 0) {
            afterHitSimulation(system, E, a);
            return;
        }

        system.setRightAngle(a);
        var w = getSpeed(a, E, system.l, system.rightBall.m) / system.l;
        w = 180 * w / Math.PI;
        var t = Date.now();
        setTimeout(function () {
            var dt = (Date.now() - t) / 1000;
            var da = w * dt;
            beforeHitSimulationStep(system, E, da);
        }, 2);
    };

    var isBad = function (n) {
        return isNaN(n) || (Math.abs(n) < 0.000001);
    }

    var afterHitSimulationStep = function (system, Er, El, dar, dal) {
        if (!$rootScope.inSimulation) {
            return;
        }

        var ar = system.rightAngle - dar;
        var al = system.leftAngle + dal;

        var maxAr = getMaxAngle(Er, system.l, system.rightBall.m);
        var maxAl = getMaxAngle(El, system.l, system.leftBall.m);

        system.setRightAngle(ar);
        system.setLeftAngle(al);

        var wr = getSpeed(ar, Er, system.l, system.rightBall.m) / system.l;
        var wl = getSpeed(al, El, system.l, system.leftBall.m) / system.l;

        if (isBad(wr) && isBad(wl)) {
            $rootScope.simulationFinished = true;
            return;
        }

        if (Math.abs(system.leftAngle) > 180) {
            system.setLeftAngle(0);
            $rootScope.simulationFinished = true;
            return;
        }

        if (isBad(wr)) {
            wr = 0;
        }

        if (isBad(wl)) {
            wl = 0;
        }

        wr = Math.sign(dar) * wr;

        wr = 180 * wr / Math.PI;
        wl = 180 * wl / Math.PI;
        var t = Date.now();
        setTimeout(function () {
            var dt = (Date.now() - t) / 1000;
            var dar = wr * dt;
            var dal = wl * dt;

            afterHitSimulationStep(system, Er, El, dar, dal);
        }, 2);
    };

    var afterHitSimulation = function (system, E, a) {
        system.setRightAngle(0);
        var v = getSpeed(0, E, system.l, system.rightBall.m);

        var vr, vl;
        if (system.isMetal()) {
            vr = (system.rightBall.m - system.leftBall.m) * v / (system.rightBall.m + system.leftBall.m);
            vl = 2 * system.rightBall.m * v / (system.rightBall.m + system.leftBall.m);
        } else {
            vr = vl = system.rightBall.m * v / (system.rightBall.m + system.leftBall.m);
        }

        var Er = system.rightBall.m * vr * vr / 2;
        var El = system.leftBall.m * vl * vl / 2;

        var wr = (180 * vr) / (system.l * Math.PI);
        var wl = (180 * vl) / (system.l * Math.PI);

        var tao = Math.abs(a / wl);
        var dar = wr * tao;
        var dal = wl * tao;
        $rootScope.$emit('taoSimulated', tao);
        afterHitSimulationStep(system, Er, El, dar, dal);
    };



    var Simulation = function (system) {
        this.system = system;
    }

    Simulation.prototype.start = function () {
        var a0 = this.system.rightAngle;
        var da = 1;
        var E = this.system.rightBall.m * g * (1 - cos(a0)) * this.system.l;
        beforeHitSimulationStep(this.system, E, da);
    };

    return Simulation;
}])
.controller('ballhitController', ['svg', 'Ball', 'geometryHelper', 'PendulumSystem', 'Simulation', '$rootScope', function (svg, Ball, geometryHelper, PendulumSystem, Simulation, $rootScope) {
    var drawRect = geometryHelper.drawRect;
    var drawLine = geometryHelper.drawLine;
    var drawTri = geometryHelper.drawTri;

    var cnst = {
        g: 9.8,
        maxAngle: 55
    };
    var scalesText = null;


    var drawScales = function () {
        var right = 600;
        var blockWidth = 600;

        var block = drawRect(0, 50, blockWidth, 40);


        drawLine(right - 40, 90, right - 40, 150, 1);
        drawTri(right - 40, 150);

        svg.text(405, 80, 'Весы (кг.)').attr({ fontSize: 20, fill: 'black' });
        svg.rect(495, 55,100, 30).attr({ fill: '#00f', stroke: '#000000', strokeWidth: 2 });
        scalesText = svg.text(500, 80, '0.000').attr({ fontSize: 30, fill: '#fff' });
    };

    var drawStand = function () {
        var bottom = 400;
        var blockHeight = 60;
        drawLine(180, 342, 160, 320, 4);
        drawLine(220, 342, 240, 320, 4);
        var mainBlock = drawRect(50, bottom - blockHeight, 300, blockHeight);

        drawLine(200, 90, 200, 150, 4);
        drawLine(180, 150, 220, 150, 4);
      
        svg.path('M193 315 A 165 165 0 0 1 28 150').attr({ fill: 'transparent', stroke: "#b4b4b4", strokeWidth: 40 });
        for (var d = 0; d <= 90; d++) {
            var l = (d % 5 === 0) ? 330 : 325;
            l = (d % 10 === 0) ? 335 : l;
            svg.line(193, 315, 193, l).attr({ stroke: '#000000', strokeWidth: 1 }).transform('r' + d + ' 193 150');
        }
        for (var d = 10; d <= 90; d+=10) {
            svg.text(193, 312, d.toString()).attr({ fontSize: 15, fill: '#000' }).transform('r' + d + ' 193 150');
        }

        svg.path('M207 315 A 165 165 0 0 0 372 150').attr({ fill: 'transparent', stroke: "#b4b4b4", strokeWidth: 40 });
        for (var d = 0; d <= 90; d++) {
            var l = (d % 5 === 0) ? 330 : 325;
            l = (d % 10 === 0) ? 335 : l;
            svg.line(207, 315, 207, l).attr({ stroke: '#000000', strokeWidth: 1 }).transform('r-' + d + ' 207 150');
        }
        for (var d = 10; d <= 90; d += 10) {
            svg.text(192, 312, d.toString()).attr({ fontSize: 15, fill: '#000' }).transform('r-' + d + ' 207 150');;
        }
    };

    var drawStaticContent = function () {
        drawScales();
        drawStand();
    };


    var timerText = null;
    var createActiveElements = function () {
        var buttonFill = svg.gradient('l(0,0,0,1)rgb(200, 200, 200)-rgb(100, 100, 100)');
        var buttonPushedFill = svg.gradient('l(0,0,0,1)rgb(100, 100, 100)-rgb(200, 200, 200)');

        var posX = -50;
        var posY = 350;
        var startButtonRect = svg.rect(posX + 110, posY, 80, 30).attr({ stroke: '#000000', strokeWidth: 2, fill: buttonFill });
        var startButtonText = svg.text(posX + 118, posY + 22, 'Старт').attr({ fontSize: 25 });
        var startButton = svg.group(startButtonRect, startButtonText).attr({ cursor: 'pointer' });
        startButton.mousedown(function () {
            startButtonRect.attr({ fill: buttonPushedFill });

        }).click(function () {
            startButtonRect.attr({ fill: buttonFill });
            if (pendulumSystem.leftBall && pendulumSystem.rightBall && pendulumSystem.rightAngle > 10) {
                $rootScope.inSimulation = true;
                var simulation = new Simulation(pendulumSystem);
                simulation.start();
            }
        });

        posX = 40;
        posY = 350;
        var resetButtonRect = svg.rect(posX + 110, posY, 80, 30).attr({ stroke: '#000000', strokeWidth: 2, fill: buttonFill });
        var resetButtonText = svg.text(posX + 118, posY + 22, 'Сброс').attr({ fontSize: 25 });
        var resetButton = svg.group(resetButtonRect, resetButtonText).attr({ cursor: 'pointer' });
        resetButton.mousedown(function () {
            resetButtonRect.attr({ fill: buttonPushedFill });
        }).click(function () {
            resetButtonRect.attr({ fill: buttonFill });
            $rootScope.inSimulation = false;
            $rootScope.ballsLocked = false;
            pendulumSystem.setLeftAngle(0);
            pendulumSystem.setRightAngle(0);
            timerText.attr({ text: '0.0000' });
        });

        svg.rect(240, 350, 100, 30).attr({ fill: '#00f', stroke: '#000000', strokeWidth: 2 });
        timerText = svg.text(250, 375, '0.0000').attr({ fontSize: 30, fill: '#fff' });
    };



    var ballOnScales = null;
    var putBallOnScales = function (ball) {
        ball.setPos({ cx: 560, cy: 150 });
        scalesText.attr({ text: ball.m.toFixed(3) });
        if (ballOnScales) {
            ballOnScales.setPos(ballOnScales.home);
        }
        ballOnScales = ball;
    };

    $rootScope.$on('ballEndDrag', function (e, ball) {
        var pl = pendulumSystem.getLeftPos();
        var pr = pendulumSystem.getRightPos();

        if (ball.isNearPoint(pl.cx, pl.cy, 7)) {
            pendulumSystem.setLeftBall(ball);
        } else if (ball.isNearPoint(pr.cx, pr.cy, 7)) {
            pendulumSystem.setRightBall(ball);
        } else if (ball.isNearPoint(560, 150, 15)) {
            putBallOnScales(ball);
        } else {
            ball.setPos(ball.home);
        }      
    });

    $rootScope.$on('ballBeginDrag', function (e, ball) {
        if (ball === ballOnScales) {
            ballOnScales = null;
            scalesText.attr({ text: '0.000' });
        }

        if (ball === pendulumSystem.leftBall) {
            pendulumSystem.leftBall = null;
            var bbox = ball.element.getBBox();
            ball.element.transform('');
            ball.setPos({ cx: bbox.cx, cy: bbox.cy });
        }

        if (ball === pendulumSystem.rightBall) {
            pendulumSystem.rightBall = null;
            var bbox = ball.element.getBBox();
            ball.element.transform('');
            ball.setPos({ cx: bbox.cx, cy: bbox.cy });
        }
    });

    $rootScope.$on('taoSimulated', function (e, tao) {
        timerText.attr({ text: tao.toFixed(4) });
    });

    drawStaticContent();
    createActiveElements();
    var pendulumSystem = new PendulumSystem({ x: 200, y: 150 }, 150, 7);
    var balls = [];
    for (var i = 2; i < 6; i++) {
        balls.push(new Ball(0.01 * i, 6.5, false, -40 + i * 40, 45));
        balls.push(new Ball(0.01 * i, 6.5, false, -40 + i * 40 + 15, 45));

        balls.push(new Ball(0.01 * i, 6.5, true, 200 + i * 40, 45));
        balls.push(new Ball(0.01 * i, 6.5, true, 200 + i * 40 + 15, 45));
    }

    pendulumSystem.setLeftAngle(0);

    window.sss = function (a) {
        pendulumSystem.setLeftAngle(a);
    }
}]);
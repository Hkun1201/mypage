/**
 * Created by 狄成竹 on 2017/3/16.
 */
//
var country_name=document.getElementById("name")
var country_area=document.getElementById("area")
var mouse_xyz=document.getElementById("xyz")
var mouse_lat_lng=document.getElementById("lat_lng")
var city_box=document.getElementById("obj_info_box")
var city_name=city_box.getElementsByClassName("name")[0]
var wireframe=true
var objects,cities,cities_cylinder,city_info_geometries=null
var startPoint=null,endPoint=null,lines=new THREE.Object3D()
var helper_mesh,mesh,cmesh,testline,cylinder,sphere, tests,color_change_timeout,change_earth_material,temp_city_info_object=null
var raycaster,intersects,mouse,intersectscountries,tempObject=null,tempcolor=null
var INTERSECTED,earth_texture_material,draw_line_anime
var camera, scene, renderer, controls, root_object = 0,radius=300
var uniform_color = false, uniform_height = false, extrusion_amount = 5.0,city_lines_amount=320
var halfwidth=30,halfheight=30

//xyz坐标转换经纬度
var lat_lng_from_xyz=function (x,y,z) {
    var lat=Math.atan(y/Math.sqrt(Math.pow(x,2)+Math.pow(z,2)))*180/Math.PI
    var lng= (function ( ){
        if (z>0){//西半球
            return -90+Math.atan(x/z)*180/Math.PI
        }else if (z<0){//东半球
            return 90+Math.atan(x/z)*180/Math.PI
        }else {
            return 0
        }

    })( )
    return [lat,lng]
}
//经纬度转换xyz坐标
var xyz_from_lat_lng=function(lat, lng, radius) {
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (360 - lng) * Math.PI / 180;

    return new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
}
//海伦公式，求得平面面积
var getArea=function (tempObject) {
    var math=Math
    var area = 0
    var S
    for (i = 0; i < tempObject.geometry.faces.length; i++) {
        var A = tempObject.geometry.vertices[tempObject.geometry.faces[i].a]
        var B = tempObject.geometry.vertices[tempObject.geometry.faces[i].b]
        var C = tempObject.geometry.vertices[tempObject.geometry.faces[i].c]
        var a = math.sqrt(math.pow(A.x - B.x, 2) + math.pow(A.y - B.y, 2) + math.pow(A.z - B.z, 2))
        var b = math.sqrt(math.pow(B.x - C.x, 2) + math.pow(B.y - C.y, 2) + math.pow(B.z - C.z, 2))
        var c = math.sqrt(math.pow(C.x - A.x, 2) + math.pow(C.y - A.y, 2) + math.pow(C.z - A.z, 2))
        var p = 0.5 * (a + b + c)
        S = math.sqrt(p * (p - a) * (p - b) * (p - c))
        area+=S
    }
    return area
}
//根据起始点经纬度生成平滑曲线连线
var getspline=function (start_lat,start_lng,end_lat,end_lng) {
    var points=[]
    var max_height = (Math.random() * 20)+20;
    for (var i = 0, spline_control_points = 8; i < spline_control_points + 1; i++) {
        var arc_angle = i * 180.0 / spline_control_points;
        var arc_radius = radius + (Math.sin(arc_angle * Math.PI / 180.0)) * max_height;
        var latlng = latlngInterPoint(start_lat, start_lng, end_lat, end_lng, i / spline_control_points);

        var pos = xyz_from_lat_lng(latlng.lat, latlng.lng, arc_radius);

        points.push(new THREE.Vector3(pos.x, pos.y, pos.z));
    }
    return new THREE.CatmullRomCurve3(points);
}



    function latlngInterPoint(lat1, lng1, lat2, lng2, offset) {
    lat1 = lat1 * Math.PI / 180.0;
    lng1 = lng1 * Math.PI / 180.0;
    lat2 = lat2 * Math.PI / 180.0;
    lng2 = lng2 * Math.PI / 180.0;

    d = 2 * Math.asin(Math.sqrt(Math.pow((Math.sin((lat1 - lat2) / 2)), 2) +
            Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lng1 - lng2) / 2), 2)));
    A = Math.sin((1 - offset) * d) / Math.sin(d);
    B = Math.sin(offset * d) / Math.sin(d);
    x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
    y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
    z = A * Math.sin(lat1) + B * Math.sin(lat2);
    lat = Math.atan2(z, Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2))) * 180 / Math.PI;
    lng = Math.atan2(y, x) * 180 / Math.PI;

    return {
        lat: lat,
        lng: lng
    };
}

//逐渐生成一条线段
var drawline=function (linegeometry,linematerial,curveLength) {
    var lineObject=new THREE.Object3D(),tempGeom,i=0
    lines.add(lineObject)
    draw_line_anime=setInterval(function () {
        scene.remove(lineObject)
        if(i===linegeometry.vertices.length-1){
            clearInterval(draw_line_anime)
        }
        i++
        tempGeom=linegeometry.clone()
        tempGeom.vertices=tempGeom.vertices.slice(0,i)
        lineObject=new THREE.Line(tempGeom,linematerial)
        lines.add(lineObject)
    },20)
}

//信息框
var getdialogmesh=function () {
    var dialogshape=new THREE.Shape()
    dialogshape.moveTo(-halfwidth,halfheight+1.4*halfheight)
    dialogshape.lineTo(halfwidth,halfheight+1.4*halfheight)
    dialogshape.lineTo(halfwidth,-halfheight+1.4*halfheight)
    dialogshape.lineTo(-halfwidth,-halfheight+1.4*halfheight)
    dialogshape.lineTo(-halfwidth,halfheight+1.4*halfheight)
    var geometry = new THREE.ShapeGeometry( dialogshape );
    var material = new THREE.MeshBasicMaterial( { color: 0x00ff00,opacity:0.7, transparent:true} );
    var mesh = new THREE.Mesh( geometry, material ) ;
    return mesh
}

init();
animate();

function init() {
    var start_lat,start_lng,end_lat,end_lng
    //加载外部组件
    var earth_surf_loader=new THREE.TextureLoader()
    earth_surf_loader.load("../resource/textures/earth_surface.jpg",function (texture) {
        earth_texture_material=new THREE.MeshBasicMaterial({
            color:0xf0ffff,
            map:texture
        })
    })
    var obj_loader=new THREE.OBJLoader()

    tests=new THREE.Object3D()
    objects=new THREE.Object3D()
    //拾取射线
    raycaster=new THREE.Raycaster()
    mouse= new THREE.Vector2()


    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setClearColor(0xfffffff, 1.0);//设置底色
    renderer.setSize(window.innerWidth, window.innerHeight);//画布全屏
    document.body.appendChild(renderer.domElement);//画布元素加入document



    document.addEventListener('mousemove', onDocumentMouseMove, false)
    renderer.domElement.addEventListener('click', onDocumentMouseClick, false)

    function add_cities() {
        if (city_info_geometries!=null){

            scene.remove(city_info_geometries)
            city_info_geometries=null
        }
        var x,z,y,lat,lng,vec3,vec3start={},vec3end={}
        cities=new THREE.Object3D()
        city_info_geometries=new THREE.Object3D()
        cities_cylinder=new THREE.Object3D()
        var material
        var geometry = new THREE.SphereGeometry(2, 32, 32 );
        for (var i=0;i<locations.length;i++){
            material=new THREE.MeshBasicMaterial({color: 0xffff00})
            lat=locations[i].lat
            lng=locations[i].lng
            vec3=xyz_from_lat_lng(lat,lng,parseInt(radius)+parseInt(extrusion_amount)).normalize()//取得该点的矢量并且归一化
            vec3start.x=vec3.x*radius
            vec3start.y=vec3.y*radius
            vec3start.z=vec3.z*radius
            vec3end.x=vec3.x*city_lines_amount
            vec3end.y=vec3.y*city_lines_amount
            vec3end.z=vec3.z*city_lines_amount
            locations[i].position={x:vec3start.x,y:vec3start.y,z:vec3start.z}
            locations[i].normal=vec3
            locations[i].facePoint=new THREE.Mesh(new THREE.SphereGeometry( 2, 32, 32 ),new THREE.MeshBasicMaterial())
            locations[i].facePoint.position.set(vec3.x*1000,vec3.y*1000,vec3.z*1000)
            // var cygeometry = new THREE.CylinderGeometry( 5, 5, 20, 32 );
            var city_mesh=new THREE.Mesh(geometry, material);
            // var cylinder = new THREE.Mesh( cygeometry, material );

//            city_mesh.position.set(xyz_from_lat_lng(lat,lng,parseInt(radius)+parseInt(extrusion_amount)).x,xyz_from_lat_lng(lat,lng,parseInt(radius)+parseInt(extrusion_amount)).y,xyz_from_lat_lng(lat,lng,parseInt(radius)+parseInt(extrusion_amount)).z)
//             cylinder.position.set(xyz_from_lat_lng(lat,lng,parseInt(radius)+parseInt(extrusion_amount)).x,xyz_from_lat_lng(lat,lng,parseInt(radius)+parseInt(extrusion_amount)).y,xyz_from_lat_lng(lat,lng,parseInt(radius)+parseInt(extrusion_amount)).z)
//            city_mesh.position.set(vec3end.x,vec3end.y,vec3end.z)
            //line

            var lgeometry = new THREE.Geometry();
            lgeometry.vertices.push(
                new THREE.Vector3( vec3start.x, vec3start.y, vec3start.z ),
                new THREE.Vector3( vec3end.x, vec3end.y, vec3end.z )
            );
            var line= new THREE.Line( lgeometry, material );
            line.geometry.verticesNeedUpdate=true
            line.city_name=locations[i].name
//            console.log(line)
            city_info_geometries.add(line)
            city_mesh.city_name=locations[i].name
//            cities.add(city_mesh)
            /*
             var d=getdialogmesh()
             d.position.set(xyz_from_lat_lng(lat,lng,parseInt(radius)+parseInt(extrusion_amount)).x,xyz_from_lat_lng(lat,lng,parseInt(radius)+parseInt(extrusion_amount)).y,xyz_from_lat_lng(lat,lng,parseInt(radius)+parseInt(extrusion_amount)).z)
             var ss=d.position.clone().normalize()
             d.rotation.x=ss.x
             d.rotation.y=ss.y
             d.rotation.z=ss.z
             scene.add(d)
             */
//            console.log(cylinder)
//            cities_cylinder.add(cylinder)

        }
//        console.log(city_info_geometries)
        scene.add(city_info_geometries)
        scene.add(cities)
        scene.add(cities_cylinder)
    }

    function add_country(shape_points,name) {
        var shape = new THREE.Shape(shape_points);
//        console.log( getArea(new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial( { color: 0x00ff00 } ))))
        var area=getArea(new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial( { color: 0x00ff00 } )))
        var shape_geom
        var inner_radius = 300.0
        var outer_radius = 305.0

        shape_geom = shape.extrude({
            amount: outer_radius - inner_radius,
            bevelEnabled: false
        })

        var offset = 0;
        if ( ! uniform_height )
            offset = Math.random() * extrusion_amount;//外层高度偏移量0~5

        shape_geom.vertices.forEach(function (vert, index) {
            var radius = 0.0;
            if (index < shape_geom.vertices.length / 2) {
                radius = inner_radius;
            } else {
                radius = inner_radius + extrusion_amount + offset
            }
            var phi = (90.0 - vert.y) * Math.PI / 180.0
            var theta = (360.0 - vert.x) * Math.PI / 180.0
            vert.x = radius * Math.sin(phi) * Math.cos(theta)
            vert.y = radius * Math.cos(phi)
            vert.z = radius * Math.sin(phi) * Math.sin(theta)
        });

        var color = new THREE.Color(0xaa9933);
        if (! uniform_color)
            color.setHSL(Math.random(),0.8,0.8 );

        var shape_material = new THREE.MeshBasicMaterial({
            wireframe:wireframe,
            color: color,
            side: THREE.DoubleSide
        });
        var shape_mesh = new THREE.Mesh(shape_geom, shape_material);
        shape_mesh.counter_name=name
        shape_mesh.area=area
        root_object.add(shape_mesh);
    }

    function add_all_countries() {
        if ( root_object ) {
            scene.remove(root_object);
        }

        root_object = new THREE.Object3D();
//        console.log(root_object)
        scene.add(root_object);

        countries.features.forEach(function (country) {
            var shape_points = [];
            if (country.geometry.coordinates.length === 1) {
                country.geometry.coordinates[0].forEach(function (points) {
                    shape_points.push(new THREE.Vector2(points[0], points[1]));
                });
                add_country(shape_points,country.properties.name);
            } else {
                country.geometry.coordinates.forEach(function (coord_set) {
                    if (coord_set.length == 1) {
                        shape_points = [];
                        coord_set[0].forEach(function (points) {
                            shape_points.push(new THREE.Vector2(points[0], points[1]));
                        });
                        add_country(shape_points,country.properties.name);
                    } else {
                        shape_points = [];
                        coord_set.forEach(function (points) {
                            shape_points.push(new THREE.Vector2(points[0], points[1]));
                        });
                        add_country(shape_points,country.properties.name);
                    }
                });
            }
        });
    }

    function onDocumentMouseMove(event) {
        event.preventDefault()
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function onDocumentMouseClick() {
        if (intersects.length > 0) {
            if (intersects[0].point !== null ) {
                var temp_geometry
                //判断是否存在startP
                if (startPoint===null){
                    temp_geometry = new THREE.SphereGeometry( 2, 32, 32 );
                    temp_geometry.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI / 2));
                    startPoint = new THREE.Mesh(temp_geometry, new THREE.MeshNormalMaterial());
                    startPoint.position.copy(intersects[0].point);
                    scene.add(startPoint);
                    //startP的数据映射到gui中
                    //世界坐标
                    //获取起点经纬度
                    start_lat=lat_lng_from_xyz(intersects[0].point.x,intersects[0].point.y,intersects[0].point.z)[0]
                    start_lng=lat_lng_from_xyz(intersects[0].point.x,intersects[0].point.y,intersects[0].point.z)[1]

                    gui_startP.setValue("x:"+Math.floor(startPoint.position.x*10)/10+","+"y:"+Math.floor(startPoint.position.y*10)/10+","+"z:"+Math.floor(startPoint.position.z*10)/10)
                    gui_start_lat_lng.setValue(Math.floor(100*lat_lng_from_xyz(intersects[0].point.x,intersects[0].point.y,intersects[0].point.z)[0])/100+" "+Math.floor(100*lat_lng_from_xyz(intersects[0].point.x,intersects[0].point.y,intersects[0].point.z)[1])/100)
                    //经纬度
                }else {//起点存在设置终点
                    temp_geometry = new THREE.SphereGeometry( 2, 32, 32 );
                    temp_geometry.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI / 2));
                    if (endPoint===null) {
                        endPoint = new THREE.Mesh(temp_geometry, new THREE.MeshNormalMaterial());
                        endPoint.position.copy(intersects[0].point);
                        scene.add(endPoint);

                        //获取终点经纬度
                        end_lat=lat_lng_from_xyz(intersects[0].point.x,intersects[0].point.y,intersects[0].point.z)[0]
                        end_lng=lat_lng_from_xyz(intersects[0].point.x,intersects[0].point.y,intersects[0].point.z)[1]

                        gui_endP.setValue("x:"+Math.floor(endPoint.position.x*10)/10+","+"y:"+Math.floor(endPoint.position.y*10)/10+","+"z:"+Math.floor(endPoint.position.z*10)/10)
                        gui_end_lat_lng.setValue(Math.floor(100*lat_lng_from_xyz(intersects[0].point.x,intersects[0].point.y,intersects[0].point.z)[0])/100+" "+Math.floor(100*lat_lng_from_xyz(intersects[0].point.x,intersects[0].point.y,intersects[0].point.z)[1])/100)
                        //创建一条连线
                        var midPointPosition= (function (){//算出中点
                            var x,y,z
                            //首先获取start与end连线中点的x,y,z
                            x=(endPoint.position.x+startPoint.position.x)/2
                            y=(endPoint.position.y+startPoint.position.y)/2
                            z=(endPoint.position.z+startPoint.position.z)/2
                            /*
                             var midPoint=new THREE.Mesh(temp_geometry, new THREE.MeshNormalMaterial())
                             midPoint.position.set((endPoint.position.x+startPoint.position.x)/2,(endPoint.position.y+startPoint.position.y)/2,(endPoint.position.z+startPoint.position.z)/2)
                             scene.add(midPoint)
                             */
                            //接着取得上述点与地球圆心的向量，并且将它normalize()
                            var temp_vec=new THREE.Vector3(x,y,z).normalize()
                            x=(temp_vec.x*(radius))
                            y=(temp_vec.y*(radius))
                            z=(temp_vec.z*(radius))
                            return {
                                x:x,
                                y:y,
                                z:z
                            }
                        })()
                        var material = new THREE.LineBasicMaterial();
                        material.color.setRGB(Math.random(),Math.random(),Math.random())

                        splcurve=getspline(start_lat,start_lng,end_lat,end_lng)
                        console.log(splcurve.getLength())
                        /*
                        var curve = new THREE.SplineCurve3([
                            new THREE.Vector3(startPoint.position.x,startPoint.position.y,startPoint.position.z),
//                                    new THREE.Vector3((startPoint.position.x+midPointPosition.x)/2,(startPoint.position.y+midPointPosition.y)/2,(startPoint.position.z+midPointPosition.z)/2),
                            new THREE.Vector3(midPointPosition.x*1.05,midPointPosition.y*1.05,midPointPosition.z*1.05),
//                                    new THREE.Vector3((midPointPosition.x+endPoint.position.x)/2,(midPointPosition.y+endPoint.position.y)/2,(midPointPosition.z+endPoint.position.z)/2),
                            new THREE.Vector3(endPoint.position.x,endPoint.position.y,endPoint.position.z)
                        ])
                        */
                        //平滑曲线
                        var geometry=new THREE.Geometry()
//                            console.log(curve)
                        geometry.vertices=splcurve.getPoints(49+50*(Math.floor(splcurve.getLength()/150)))
                        console.log(geometry.vertices.length)
//                            console.log(12121)

                        console.log(geometry.vertices)
                        drawline(geometry,material,splcurve.getLength())

                        // var line=new THREE.Line(geometry, material)
//                            console.log("midpoint")
//                            console.log(midPointPosition)


//                            console.log("curve.getPoint")
//                            console.log(curve.getPoint(1/2))
//                         lines.push(line)
//                         scene.add(line)
                        /*
                         var midPoint=new THREE.Mesh(temp_geometry, new THREE.MeshNormalMaterial())
                         midPoint.position.set(midPointPosition.x,midPointPosition.y,midPointPosition.z)
                         scene.add(midPoint)
                         */
                    }
                }
            }
        }
    }


    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(0,0,400)

    var amblight = new THREE.AmbientLight( 0x404040 ); //自然光
    scene.add( amblight );

    var light = new THREE.DirectionalLight(0xffffff);//创建平行光
    light.position.set(50, 0, 0);
    scene.add(light);
    var light2 = new THREE.DirectionalLight(0xffffff);
    light2.position.set(0, 0, 50);
    scene.add(light2);
    var light3 = new THREE.DirectionalLight(0xffffff);
    light3.position.set(-50, 0, 0);
    scene.add(light3);
    var light4 = new THREE.DirectionalLight(0xffffff);
    light4.position.set(0, 0, -50);
    scene.add(light4);
    var light5 = new THREE.DirectionalLight(0xffffff);
    light5.position.set(0, 50, 0);
    scene.add(light5);

    scene.add(lines)
    obj_loader.load("../resource/Airplanes.obj",function (object) {
        for (var i=0;i<object.children.length;i++) {
            object.children[i].material = new THREE.MeshLambertMaterial({color: 0x00ff00})
        }
        scene.add(object)
        console.log(object)
    })
    
    
    
    //GUI
    var FizzyText = function() {
        this.startPoint=""
        this.endPoint=""
        this.start_lat_lng=""
        this.end_lat_lng=""
        this.reset = function() { };
    };
    var text=new FizzyText()
    text.RESETVIEW=function () {
        scene.remove(camera);

        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 2000);

        camera.position.set(-95*1.5,278*1.5,-372*1.5)

        controls = new THREE.TrackballControls(camera, renderer.domElement);//
        controls.rotateSpeed = 4.0;

    }

    text.reset=function () {
        clearInterval(draw_line_anime)
        scene.remove(lines)
        lines=new THREE.Object3D()
        scene.add( lines)
        if (startPoint!==null){
            scene.remove(startPoint)
        }
        if (endPoint!==null){
            scene.remove(endPoint)
        }
        startPoint=null
        endPoint=null
        gui_startP.setValue("")
        gui_endP.setValue("")
        gui_start_lat_lng.setValue("")
        gui_end_lat_lng.setValue("")
    }
    text.change_earth_texture=function () {
        change_earth_material()
    }
    text.wireframe=true
    text.city_info_shape="line"
    text.city_info_color="#ffff00"
    //
    var gui = new dat.GUI();
    gui.add(this, 'uniform_color', false)
        .name("Uniform Color")
        .onChange( function(value) {
            add_all_countries();
        });
    gui.add(this, 'uniform_height', false)
        .name("Uniform Height")
        .onChange( function(value) {
            add_all_countries();
        });
    gui.add(this, 'extrusion_amount', 1, 40.0).name("Extrusion Amount")
        .onFinishChange( function(value) {
            add_all_countries();
        });
    var gui_city_info_shape=gui.add(text,"city_info_shape",["line","cylinder"]).onFinishChange(function (value) {
        city_info_unit.set_info_looks({shape:value})
    })
    var gui_city_info_color=gui.addColor(text,"city_info_color").onFinishChange(function (value) {
        clearTimeout(color_change_timeout)
        color_change_timeout=setTimeout(city_info_unit.set_info_looks({color:value}),1000)
    })
    var gui_startP=gui.add(text,"startPoint")
    var gui_endP=gui.add(text,"endPoint")
    var gui_start_lat_lng=gui.add(text,"start_lat_lng")
    var gui_end_lat_lng=gui.add(text,"end_lat_lng")
    var gui_reset_camrea=gui.add(text,"RESETVIEW")
    gui.add(text,"reset")
    gui.add(text,"change_earth_texture")
    gui.add(text,"wireframe").onFinishChange(function (value) {
        for (var i=0;i<root_object.children.length;i++){
            root_object.children[i].material.wireframe=!root_object.children[i].material.wireframe
        }
        wireframe=!wireframe
    })
//        console.log(gui_startP)

    var radius = 300;
    var segments = 128;
    var rings = 128;

    //模型
    /*
     //地图
     var geoP=[]
     var geo=[[61.210817,35.650072],[62.230651,35.270664],[62.984662,35.404041],[63.193538,35.857166],[63.982896,36.007957],[64.546479,36.312073],[64.746105,37.111818],[65.588948,37.305217],[65.745631,37.661164],[66.217385,37.39379],[66.518607,37.362784],[67.075782,37.356144],[67.83,37.144994],[68.135562,37.023115],[68.859446,37.344336],[69.196273,37.151144],[69.518785,37.608997],[70.116578,37.588223],[70.270574,37.735165],[70.376304,38.138396],[70.806821,38.486282],[71.348131,38.258905],[71.239404,37.953265],[71.541918,37.905774],[71.448693,37.065645],[71.844638,36.738171],[72.193041,36.948288],[72.63689,37.047558],[73.260056,37.495257],[73.948696,37.421566],[74.980002,37.41999],[75.158028,37.133031],[74.575893,37.020841],[74.067552,36.836176],[72.920025,36.720007],[71.846292,36.509942],[71.262348,36.074388],[71.498768,35.650563],[71.613076,35.153203],[71.115019,34.733126],[71.156773,34.348911],[70.881803,33.988856],[69.930543,34.02012],[70.323594,33.358533],[69.687147,33.105499],[69.262522,32.501944],[69.317764,31.901412],[68.926677,31.620189],[68.556932,31.71331],[67.792689,31.58293],[67.683394,31.303154],[66.938891,31.304911],[66.381458,30.738899],[66.346473,29.887943],[65.046862,29.472181],[64.350419,29.560031],[64.148002,29.340819],[63.550261,29.468331],[62.549857,29.318572],[60.874248,29.829239],[61.781222,30.73585],[61.699314,31.379506],[60.941945,31.548075],[60.863655,32.18292],[60.536078,32.981269],[60.9637,33.528832],[60.52843,33.676446],[60.803193,34.404102],[61.210817,35.650072]]
     for (var i=0;i<geo.length;i++){
     geoP.push(new THREE.Vector2(geo[i][0], geo[i][1]))
     }
     //        console.log("geoP")
     //        console.log(geoP)
     */
    /*
     var geoj=new THREE.Shape(geoP)
     var geom = new THREE.ShapeGeometry( geoj );
     var gmesh = new THREE.Mesh(  geom, new THREE.MeshBasicMaterial( { color: 0xffff00 } ) ) ;
     scene.add( gmesh );
     */
    /*
     var geoP2=[]
     var geo2=[[16.326528,-5.87747],[16.57318,-6.622645],[16.860191,-7.222298],[17.089996,-7.545689],[17.47297,-8.068551],[18.134222,-7.987678],[18.464176,-7.847014],[19.016752,-7.988246],[19.166613,-7.738184],[19.417502,-7.155429],[20.037723,-7.116361],[20.091622,-6.94309],[20.601823,-6.939318],[20.514748,-7.299606],[21.728111,-7.290872],[21.746456,-7.920085],[21.949131,-8.305901],[21.801801,-8.908707],[21.875182,-9.523708],[22.208753,-9.894796],[22.155268,-11.084801],[22.402798,-10.993075],[22.837345,-11.017622],[23.456791,-10.867863],[23.912215,-10.926826],[24.017894,-11.237298],[23.904154,-11.722282],[24.079905,-12.191297],[23.930922,-12.565848],[24.016137,-12.911046],[21.933886,-12.898437],[21.887843,-16.08031],[22.562478,-16.898451],[23.215048,-17.523116],[21.377176,-17.930636],[18.956187,-17.789095],[18.263309,-17.309951],[14.209707,-17.353101],[14.058501,-17.423381],[13.462362,-16.971212],[12.814081,-16.941343],[12.215461,-17.111668],[11.734199,-17.301889],[11.640096,-16.673142],[11.778537,-15.793816],[12.123581,-14.878316],[12.175619,-14.449144],[12.500095,-13.5477],[12.738479,-13.137906],[13.312914,-12.48363],[13.633721,-12.038645],[13.738728,-11.297863],[13.686379,-10.731076],[13.387328,-10.373578],[13.120988,-9.766897],[12.87537,-9.166934],[12.929061,-8.959091],[13.236433,-8.562629],[12.93304,-7.596539],[12.728298,-6.927122],[12.227347,-6.294448],[12.322432,-6.100092],[12.735171,-5.965682],[13.024869,-5.984389],[13.375597,-5.864241],[16.326528,-5.87747]]
     for (var j=0;j<geo2.length;j++){
     geoP2.push(new THREE.Vector2(geo2[j][0], geo2[j][1]))
     }

     var geoj2=new THREE.Shape(geoP2)
     var geom2 = new THREE.ShapeGeometry( geoj2 );
     var gmesh2 = new THREE.Mesh(  geom2, new THREE.MeshLambertMaterial( { color: 0xffff00 } ) ) ;
     //        scene.add( gmesh2 );
     //        /*
     //拉伸
     var extrudeSettings = {
     steps: 2,
     amount: 16,
     bevelEnabled: true,
     bevelThickness: 1,
     bevelSize: 1,
     bevelSegments: 1
     }
     var geoex = new THREE.ExtrudeGeometry( geoj, extrudeSettings );
     var gexmesh = new THREE.Mesh( geoex, new THREE.MeshBasicMaterial( { color: 0xffff00 } )  ) ;
     gexmesh.position.x=-20
     gexmesh.lookAt(1,0,0)
     */
//        scene.add( gexmesh );
//        */
    /*
     //拉伸的心形
     var x = 0, y = 0;

     var heartShape = new THREE.Shape();

     heartShape.moveTo( x + 5, y + 5 );
     heartShape.bezierCurveTo( x + 5, y + 5, x + 4, y, x, y );
     heartShape.bezierCurveTo( x - 6, y, x - 6, y + 7,x - 6, y + 7 );
     heartShape.bezierCurveTo( x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19 );
     heartShape.bezierCurveTo( x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7 );
     heartShape.bezierCurveTo( x + 16, y + 7, x + 16, y, x + 10, y );
     heartShape.bezierCurveTo( x + 7, y, x + 5, y + 5, x + 5, y + 5 );

     var hextrudeSettings = {
     steps: 2,
     amount: 3,
     bevelEnabled: true,
     bevelThickness: 1,
     bevelSize: 1,
     bevelSegments: 1
     };

     var hgeometry = new THREE.ExtrudeGeometry( heartShape, hextrudeSettings );
     var hmaterial = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
     var hmesh = new THREE.Mesh( hgeometry, hmaterial ) ;
     hmesh.up.x=1
     hmesh.up.y=0
     hmesh.up.z=0
     scene.add( hmesh );
     */
    /*

     var XYplane = new THREE.Mesh(new THREE.PlaneGeometry(80,80), new THREE.MeshLambertMaterial( {color: 0x0fff00 , opacity:0.3,transparent:true}));
     XYplane.castShadow = false;
     XYplane.receiveShadow = true;
     XYplane.material.side=THREE.DoubleSide
     XYplane.position.set(0, 0, 0);
     scene.add(XYplane);

     var XZplane = new THREE.Mesh(new THREE.PlaneGeometry(80,80), new THREE.MeshLambertMaterial( {color: 0x0fff00 , opacity:0.3,transparent:true}));
     XZplane.castShadow = false;
     XZplane.receiveShadow = true;
     XZplane.material.side=THREE.DoubleSide
     XZplane.rotation.x=Math.PI/2
     XZplane.position.set(0, 0, 0);
     scene.add(XZplane);

     var YZplane = new THREE.Mesh(new THREE.PlaneGeometry(80,80), new THREE.MeshLambertMaterial( {color: 0x0fff00 , opacity:0.3,transparent:true}));
     YZplane.castShadow = false;
     YZplane.receiveShadow = true;
     YZplane.material.side=THREE.DoubleSide
     YZplane.rotation.y=Math.PI/2
     YZplane.position.set(0, 0, 0);
     scene.add(YZplane);


     var test=function () {
     var lgeometry = new THREE.Geometry();
     //            lgeometry.rotateZ(Math.PI / 2)
     lgeometry.vertices.push(
     new THREE.Vector3( 0, 0, 0 ),
     new THREE.Vector3( 0, 40, 0 )
     );
     testline= new THREE.Line( lgeometry, new THREE.MeshBasicMaterial( { color: 0x000000 } ) );

     scene.add(testline)
     }
     test()
     */
    /*
     sphere = new THREE.Mesh( new THREE.SphereGeometry( 100, 20, 20 ), new THREE.MeshNormalMaterial() );
     sphere.position.set(200,200,200)
     //        scene.add( sphere );

     var cygeometry = new THREE.CylinderGeometry( 5, 5, 20, 32 );
     cygeometry.rotateX(Math.PI / 2)
     cylinder = new THREE.Mesh( cygeometry, new THREE.MeshBasicMaterial( { color: 0x000000 } ) );
     cylinder.position.x=-100
     tests.add(cylinder)
     scene.add(tests)
     //        cylinder.lookAt( sphere.position );
     */

    /*
     //纹理加载练手
     var cube_geometry = new THREE.CubeGeometry( 10, 20, 10);
     var material = new THREE.MeshPhongMaterial( { map: THREE.ImageUtils.loadTexture('../resource/textures/crate.jpg')  } );
     var shaderMaterial = new THREE.ShaderMaterial({
     vertexShader: document.getElementById('vertexshader').textContent,
     fragmentShader: document.getElementById('fragmentshader').textContent,
     uniforms: {
     color: {
     type: 'v3',
     value: new THREE.Color('#60371b')
     },
     light: {
     type: 'v3',
     value: light.position
     }
     }
     });
     cmesh = new THREE.Mesh(cube_geometry, material );
     console.log("cmesh")
     console.log(cmesh)
     cmesh.position.z =0;
     scene.add( cmesh );

     */
    /*
     var helper_geometry = new THREE.SphereGeometry( 5, 32, 32 );
     helper_geometry.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI / 2));
     helper_mesh = new THREE.Mesh(helper_geometry, new THREE.MeshNormalMaterial());
     helper_mesh.position.x=500
     scene.add(helper_mesh);
     */

    /*

     ss=getdialogmesh()
     ss.position.x=-20
     scene.add(ss)
     */

    //地球模型
    var geometry = new THREE.SphereGeometry(radius, segments, rings);//创建球体 半径/经/纬
    material_map = THREE.ImageUtils.loadTexture('../resource/textures/sea_texture.jpg');//加载纹理
    material_map.wrapS = THREE.RepeatWrapping;
    material_map.wrapT = THREE.RepeatWrapping;
    material_map.repeat.set(8, 8);
    earth_basic_material = new THREE.MeshPhongMaterial({
        opacity:0.7,
        transparent:true,
        map: material_map,
        color: 0x3366aa
    });
    earth_mesh = new THREE.Mesh(geometry, earth_basic_material);//创建球体模型
    objects.add(earth_mesh)
    change_earth_material=function () {
        if (earth_mesh.material!=earth_texture_material) {
            for (var i = 0; i < root_object.children.length; i++) {
                root_object.children[i].visible = false
            }
            earth_mesh.material = earth_texture_material
        }else {
            for (var i = 0; i < root_object.children.length; i++) {
                root_object.children[i].visible = true
            }
            earth_mesh.material = earth_basic_material
        }
    }
    scene.add(objects);//加载模型


    /*
     Tgeometry = new THREE.TorusGeometry(400, 0.1, 8, 64);
     Tmaterial = new THREE.MeshBasicMaterial({
     color: 0x00ff00
     });
     Tmesh = new THREE.Mesh(Tgeometry, Tmaterial);
     scene.add(Tmesh)
     */

    //添加经纬线
    function add_lat_marker_geometry(radius, lat, size, color) {

        geometry = new THREE.TorusGeometry(radius * Math.cos(lat / 180 * Math.PI), size, 8, 64);
        material = new THREE.MeshBasicMaterial({
            color: color
        });
        mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = Math.PI / 2.0;
        mesh.position.y = radius * Math.sin(lat / 180 * Math.PI);
        return mesh;
    }

    function add_lng_marker_geometry(radius, lng, size, color) {

        geometry = new THREE.TorusGeometry(radius, size, 8, 64);
        material = new THREE.MeshBasicMaterial({
            color: color
        });
        mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.y = lng * Math.PI / 180.0;
        return mesh;
    }

    function add_marker_geometry(radius) {

        marker_mesh = new THREE.Object3D();
        scene.add(marker_mesh);

        // equator/赤道
        marker_mesh.add(add_lat_marker_geometry(radius, 0, 0.8, 0x00ff00));

        // lines of lat/纬度线
        for (var lat = -90; lat < 90; lat += 10) {
            marker_mesh.add(add_lat_marker_geometry(radius, lat, 0.4, 0x00ffff00));
        }

        // lines of lng/经度线
        for (var lng = 0; lng < 180; lng += 10) {
            marker_mesh.add(add_lng_marker_geometry(radius, lng, 0.4, 0xffff00));
        }

        // tropics/南北回归线
        marker_mesh.add(add_lat_marker_geometry(radius, 23.5, 0.4, 0xff0000));
        marker_mesh.add(add_lat_marker_geometry(radius, -23.5, 0.4, 0xff0000));
//            console.log("marker_mesh")
//            console.log(marker_mesh)
    }

    add_marker_geometry(radius)

    add_all_countries();

    add_cities()
//        cities_cylinder_rotate()
    //
    controls = new THREE.TrackballControls(camera, renderer.domElement);//
    controls.rotateSpeed = 4.0;


    window.addEventListener('resize', onWindowResize, false);//
}
///*
var flight_streams={
    flight_anime:null,
    create_random_flights:function (parms) {
        var num,curve,flight_index,flight_array=[],tempGeom,uncomplete_meshs=[],complete_meshs=[],color,material,uncomplete_lineObjects=new THREE.Object3D(),complete_lineObjects=new THREE.Object3D(),flight_streams=[]
        //决定连线数量
        if (typeof(parms)!="undefined"){
            if (parms instanceof Object) {
                if (parms.num) {
                    num = parms.num
                }
            }
        }else {
            num=100+Math.ceil(Math.random()*100)//100~200条航线
        }
        //
        for (var j=0;j<num;){//随机生成num数目的索引号
            flight_index=Math.ceil(Math.random()*flights.length)
            if (flight_array.indexOf(flight_index)==-1){
                flight_array.push(flight_index)
                j++
            }
        }
        for (var i=0;i<num;i++){//生成所有曲线的geom和mari，并且加入uncomplete列表
            var temp_flight_lat_lng=flights[flight_array[i]]
            curve=getspline(temp_flight_lat_lng[0],temp_flight_lat_lng[1],temp_flight_lat_lng[2],temp_flight_lat_lng[3])
            uncomplete_meshs.push([new THREE.Geometry(),new THREE.LineBasicMaterial()])
            uncomplete_meshs[i][0].vertices=curve.getPoints(49+50*(Math.floor(curve.getLength()/150)))
            uncomplete_meshs[i][1].color.setRGB(Math.random(),Math.random(),Math.random())
        }
        scene.add(uncomplete_lineObjects)
        scene.add(complete_lineObjects)
        j=1
        this.flight_anime=setInterval(function () {
            if (uncomplete_meshs.length<=0){//uncomplete列表清空时，计时器结束
                clearInterval(flight_streams.flight_anime)
            }else {
                if (j != 1) {//首先删除前一次绘制的曲线
                    scene.remove(uncomplete_lineObjects)
                    uncomplete_lineObjects = new THREE.Object3D()
                    scene.add(uncomplete_lineObjects)
                }
                for (i = 0; i < uncomplete_meshs.length;) {//遍历uncomplete列表
                    //首先判断是否已经绘制完毕
                    if (uncomplete_meshs[i][0].vertices.length <= j) {//所有顶点全部绘制完毕，加入complete列表，从uncomplete列表删除
                        complete_meshs.push(uncomplete_meshs[i])
                        complete_lineObjects.add(new THREE.Line(uncomplete_meshs[i][0], uncomplete_meshs[i][1]))
                        uncomplete_meshs.splice(i, 1)
                    } else {//尚未绘制完毕的情况
                        //生成新的曲线
                        tempGeom = uncomplete_meshs[i][0].clone()
                        tempGeom.vertices = tempGeom.vertices.slice(0, j)
                        uncomplete_lineObjects.add(new THREE.Line(tempGeom, uncomplete_meshs[i][1]))
                        i++
                    }
                }
                j++
            }
        },20)
        /*
         //逐渐生成一条线段
         var drawline=function (linegeometry,linematerial,curveLength) {
         var lineObject=new THREE.Object3D(),tempGeom,i=0
         lines.add(lineObject)
         draw_line_anime=setInterval(function () {
         scene.remove(lineObject)
         if(i===linegeometry.vertices.length-1){
         clearInterval(draw_line_anime)
         }
         i++
         tempGeom=linegeometry.clone()
         tempGeom.vertices=tempGeom.vertices.slice(0,i)
         lineObject=new THREE.Line(tempGeom,linematerial)
         lines.add(lineObject)
         },20)
         }
         */
    }
}
var city_info_unit= {
    amount: 20,
    color:16776960,
    shapename: "line",
    set_info_looks: function (param) {
        //相同形状/颜色不做任何改变
        var mcolor
        if (param.shape != this.shapename||param.color!=this.color) {
            if (param.shape){
                this.shapename=param.shape
            }
            if (param.color){
                mcolor=parseInt("0x"+param.color.substring(1))
                this.color=mcolor
            }else {
                mcolor=this.color
            }
            console.log(typeof mcolor)
            //删除原有的几何体
            scene.remove(city_info_geometries)
            city_info_geometries = new THREE.Object3D()
            //构造新的几何体
            var geometry,amount
            if (this.shapename==="line"){//线段
                var line
                var lmeterial
                for (var i=0;i<locations.length;i++){//生成线段

                    if (locations[i].amount){
                        amount=locations[i].amount
                    }else {
                        amount=this.amount
                    }
                    lmeterial=new THREE.LineBasicMaterial({color: mcolor})
                    geometry=new THREE.Geometry()
                    geometry.vertices.push(
                        new THREE.Vector3(0,0,0),
                        new THREE.Vector3(0,amount,0)
                    )
                    geometry.rotateX(Math.PI / 2)
                    line = new THREE.Line( geometry, lmeterial )
                    line.lookAt(locations[i].facePoint.position)
                    line.position.set(locations[i].position.x,locations[i].position.y,locations[i].position.z)
                    line.city_name=locations[i].name
                    city_info_geometries.add(line)
                }
            }else if (this.shapename==="cylinder"){//圆柱
                var mesh
                var material
                for (var i=0;i<locations.length;i++) {
                    if (locations[i].amount){
                        amount=locations[i].amount
                    }else {
                        amount=this.amount
                    }
                    material=new THREE.MeshBasicMaterial({color: mcolor})
                    geometry = new THREE.CylinderGeometry(2,2,amount,18)//构造圆柱形状
                    geometry.rotateX(Math.PI / 2)
                    mesh=new THREE.Mesh(geometry, material)//生成曲面
                    mesh.lookAt(locations[i].facePoint.position)//调整角度至平行法线方向
                    mesh.position.set(locations[i].position.x+0.5*amount*locations[i].normal.x,locations[i].position.y+0.5*amount*locations[i].normal.y,locations[i].position.z+0.5*amount*locations[i].normal.z)//移动到指定位置
                    mesh.city_name=locations[i].name
                    city_info_geometries.add(mesh)//
                }
            }
            scene.add(city_info_geometries)
        }
    },
    setamount:function (param) {
        if (typeof param==="number"&&param>0){//输入单个数字全体数值
            this.amount=param
            this.set_info_looks({shape:this.shapename})
        }else if(param instanceof Object&&param.constructor!=Array){//改变单个对象的数值
            if(param.name&&param.amount&&param.amount>0){
                for (var i=0;i<locations.length;i++) {
                    if (param.name === locations[i].name) {
                        locations[i].amount = param.amount
                        this.set_info_looks({shape: this.shapename})
                    }
                }
            }
        }else if(param instanceof Object&&param.constructor===Array) {//改变多个对象的数值
            for (var j = 0; j < param.length; j++){
                if (param[j] instanceof Object && param[j].constructor != Array) {//过滤
                    if (param[j].name && param[j].amount && param[j].amount > 0) {
                        for (var i = 0; i < locations.length; i++) {
                            if (param[j].name === locations[i].name) {
                                console.log(13)
                                locations[i].amount = param[j].amount
                                this.set_info_looks({shape: this.shapename})
                            }
                        }
                    }
                }
            }
        }
    }
}
//*/
/*
 function set_city_info_amount(new_amount) {
 if (new_amount instanceof Object&&new_amount.constructor!=Array){
 for (var i=0;i<city_info_geometries.children.length;i++){
 if (new_amount.name===city_info_geometries.children[i].city_name){
 if (new_amount.amount){
 //                        console.log(city_info_geometries.children[i].geometry.vertices)
 var vec3start=new THREE.Vector3(city_info_geometries.children[i].geometry.vertices[0].x,city_info_geometries.children[i].geometry.vertices[0].y,city_info_geometries.children[i].geometry.vertices[0].z)
 var vec3end=new THREE.Vector3(city_info_geometries.children[i].geometry.vertices[1].x,city_info_geometries.children[i].geometry.vertices[1].y,city_info_geometries.children[i].geometry.vertices[1].z)
 var name=city_info_geometries.children[i].city_name
 vec3end.normalize()

 city_info_geometries.remove(city_info_geometries.children[i])

 var lgeometry = new THREE.Geometry();
 lgeometry.vertices.push(
 new THREE.Vector3( vec3start.x, vec3start.y, vec3start.z ),
 new THREE.Vector3( vec3end.x*new_amount.amount, vec3end.y*new_amount.amount, vec3end.z*new_amount.amount )
 );
 var line= new THREE.Line( lgeometry,new THREE.MeshBasicMaterial({color: 0xffff00}) );
 line.city_name=name
 city_info_geometries.add(line)
 }

 }
 }
 }else if (new_amount instanceof Array){
 for (var i=0;i<new_amount.length;i++){
 if (new_amount[i].name){
 if (new_amount[i].amount){
 for (var j=0;j<city_info_geometries.children.length;j++){
 if (new_amount[i].name===city_info_geometries.children[j].city_name){
 //                        console.log(city_info_geometries.children[i].geometry.vertices)
 var vec3start=new THREE.Vector3(city_info_geometries.children[j].geometry.vertices[0].x,city_info_geometries.children[j].geometry.vertices[0].y,city_info_geometries.children[j].geometry.vertices[0].z)
 var vec3end=new THREE.Vector3(city_info_geometries.children[j].geometry.vertices[1].x,city_info_geometries.children[j].geometry.vertices[1].y,city_info_geometries.children[j].geometry.vertices[1].z)
 var name=city_info_geometries.children[j].city_name
 vec3end.normalize()

 city_info_geometries.remove(city_info_geometries.children[j])

 var lgeometry = new THREE.Geometry();
 lgeometry.vertices.push(
 new THREE.Vector3( vec3start.x, vec3start.y, vec3start.z ),
 new THREE.Vector3( vec3end.x*new_amount[i].amount, vec3end.y*new_amount[i].amount, vec3end.z*new_amount[i].amount )
 );
 var line= new THREE.Line( lgeometry,new THREE.MeshBasicMaterial({color: 0xffff00}) );
 line.city_name=name
 city_info_geometries.add(line)
 }
 }
 }
 }
 }
 }else {
 city_lines_amount += new_amount
 add_cities()
 }
 }
 */
/*
 function cities_cylinder_rotate() {
 var vec3
 for (var i=0;i<cities_cylinder.children.length;i++){
 console.log(cities_cylinder.children[i])
 vec3=cities_cylinder.children[i].position.clone()
 vec3.normalize()
 //            console.log(vec3)
 cities_cylinder.children[i].rotation.x=vec3.x
 cities_cylinder.children[i].rotation.y=vec3.y
 cities_cylinder.children[i].rotation.z=vec3.z
 //            console.log(cities_cylinder.children[i].rotation)
 }
 }
 */
//主程序
function animate() {
//        for ( var i = 0, l = tests.children.length; i < l; i ++ ) {


//        }

    //拾取判定
    raycaster.setFromCamera(mouse, camera);

    intersects = raycaster.intersectObjects(objects.children);//取得射线与场景中所有物体相交的合集
    if (intersects.length > 0) {
        if (intersects[0].point !== null ) {
//                helper_mesh.position.copy(intersects[0].point);
            mouse_xyz.innerHTML=Math.floor(100*intersects[0].point.x)/100+" "+Math.floor(100*intersects[0].point.y)/100+" "+Math.floor(100*intersects[0].point.z)/100
            mouse_lat_lng.innerHTML=Math.floor(100*lat_lng_from_xyz(intersects[0].point.x,intersects[0].point.y,intersects[0].point.z)[0])/100+" "+Math.floor(100*lat_lng_from_xyz(intersects[0].point.x,intersects[0].point.y,intersects[0].point.z)[1])/100
        } else {
//                helper_mesh.position.set(0.0, 0.0, 0.0)
        }
    } else {
//            helper_mesh.position.set(0, 0, 0);
    }

    intersectscountries=raycaster.intersectObjects(root_object.children)
    if ( intersectscountries.length > 0) {
        //合集中存在物体的情况
        //剔除后半球
        var contrastDistance=Math.sqrt(Math.pow((camera.position.x-mesh.position.x),2)+Math.pow((camera.position.y-mesh.position.y),2)+Math.pow((camera.position.z-mesh.position.z),2))
        if (intersectscountries[0].distance<contrastDistance) {
            if (tempObject != intersectscountries[0].object) {//排除已经选中的物体
                if (tempObject) {//存在已选中物体的情况
                    tempObject.material.color.setHex(tempObject.currentHex);//把已经选中的物体颜色恢复成原来的
                    scene.remove(tempObject.dialog)
                }

                //
                tempObject = intersectscountries[0].object;//把当前选中的物体存入
                //
                country_name.innerHTML=tempObject.counter_name
                country_area.innerHTML=Math.floor(100*tempObject.area)/100

                //
                //
                tempObject.currentHex = tempObject.material.color.getHex();//把当前选中的物体颜色存入
                //获取上表面中心点位置
                var x=0,y=0,z=0
                for (var i=tempObject.geometry.vertices.length/2;i<tempObject.geometry.vertices.length;i++){
                    x+=tempObject.geometry.vertices[i].x
                    y+=tempObject.geometry.vertices[i].y
                    z+=tempObject.geometry.vertices[i].z
                }
                x=x/(tempObject.geometry.vertices.length/2)
                y=y/(tempObject.geometry.vertices.length/2)
                z=z/(tempObject.geometry.vertices.length/2)
                /*
                 console.log(tempObject.geometry.faces.length)

                 console.log(tempObject)
                 console.log(x,y,z)
                 */

                var dialog=getdialogmesh()

//                    console.log(dialog)
                dialog.position.set(x,y,z)
                dialog.rotation.x=camera.rotation.x
                dialog.rotation.y=camera.rotation.y
                dialog.rotation.z=camera.rotation.z
//                    console.log("面积")
//                    console.log(getArea(dialog))
//                    scene.add(dialog)

                tempObject.dialog=dialog
                //
                tempObject.material.color.set(0xf0f0fe);//把当前物体的颜色改变为高亮



                /*
                 var temp_geometry = new THREE.SphereGeometry( 2, 32, 32 );
                 temp_geometry.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI / 2));
                 var  endPoint=new THREE.Mesh(temp_geometry, new THREE.MeshNormalMaterial());
                 endPoint.position.copy(tempObject.position);
                 scene.add(endPoint);
                 */
            }
        }
    } else {//鼠标移入空区域
        if (tempObject){
            tempObject.material.color.set(tempObject.currentHex);//把已经选中的物体颜色恢复成原来的
            scene.remove(tempObject.dialog)
        }
        tempObject = null;//清空临时对象
    }

    intersectscities = raycaster.intersectObjects(city_info_geometries.children)//选中城市
    if (intersectscities.length>0){//选中城市
        if (intersectscities[0].object!=null){
            if(temp_city_info_object!=intersectscities[0].object){
                if (temp_city_info_object!=null){
                    temp_city_info_object.material.color.setHex(temp_city_info_object.currentHex);//把已经选中的物体颜色恢复成原来的
                }
                temp_city_info_object = intersectscities[0].object;//把当前选中的物体存入
                //
                temp_city_info_object.currentHex = temp_city_info_object.material.color.getHex();//把当前选中的物体颜色存入
                temp_city_info_object.material.color.set(0x8993FF)
            }
//                console.log(intersectscities[0].object.city_name)
            city_name.innerHTML=intersectscities[0].object.city_name
               intersectscities[0].object.material.color.set(0x8993FF)
        }
    }else {//鼠标移入空区域
        if (temp_city_info_object!=null){
            temp_city_info_object.material.color.set(temp_city_info_object.currentHex);//把已经选中的物体颜色恢复成原来的
        }
        temp_city_info_object = null;//清空临时对象
    }
    /*

     //高亮选中国家
     intersectscountries=raycaster.intersectObjects(root_object.children)

     if (intersectscountries.length>0){
     //剔除后半球
     var contrastDistance=Math.sqrt(Math.pow((camera.position.x-mesh.position.x),2)+Math.pow((camera.position.y-mesh.position.y),2)+Math.pow((camera.position.z-mesh.position.z),2))
     if (intersectscountries[0].distance<contrastDistance){
     //                            console.log(intersectscountries[0].object.material.color)
     tempcolor=intersectscountries[0].object.material.color
     console.log( tempcolor)
     tempObject=intersectscountries[0].object
     console.log( tempObject)
     intersectscountries[0].object.material.color={ r: 255, g: 255, b: 255 }
     }else {
     if (tempObject != null && tempcolor != null) {
     tempObject.material.color = tempcolor
     tempObject = null
     }
     }
     }
     if (intersects.length > 0) {//合集中存在物体的情况
     if (INTERSECTED != intersects[0].object){//排除已经选中的物体
     if (INTERSECTED){//存在已选中物体的情况
     INTERSECTED.material.color.setHex(INTERSECTED.currentHex);//把已经选中的物体颜色恢复成原来的
     }
     //
     INTERSECTED = intersects[0].object;//把当前选中的物体存入
     //
     INTERSECTED.currentHex = INTERSECTED.material.color.getHex();//把当前选中的物体颜色存入
     //
     INTERSECTED.material.color.set( 0x000000 );//把当前物体的颜色改变为高亮（红色）
     }
     } else {//鼠标移入空区域
     if (INTERSECTED){
     INTERSECTED.material.color.set(INTERSECTED.currentHex);//把已经选中的物体颜色恢复成原来的
     }
     INTERSECTED = null;//清空临时对象
     }
     */
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
/**
 * Created by 狄成竹 on 2017/3/17.
 */
//
var wireframe=true
var objects,cities,cities_cylinder,city_info_geometries=null
var startPoint=null,endPoint=null,lines=[]
var helper_mesh,mesh,cmesh,testline,cylinder,sphere, tests,color_change_timeout,earth_texture_material,set_earth_material
var raycaster,intersects,mouse,intersectscountries,tempObject=null,tempcolor=null
var INTERSECTED;
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



var tlgeometry = new THREE.Geometry();
tlgeometry.vertices.push(
    new THREE.Vector3( -10, 0, 0 ),
    new THREE.Vector3( 0, 10, 0 ),
    new THREE.Vector3( 10, 0, 0 )
);
var tlmaterial = new THREE.LineBasicMaterial({
    color: 0x0000ff
});

init();
animate();



function init() {
    
    //加载外部组件
    var earth_surf_loader=new THREE.TextureLoader()
    earth_surf_loader.load("../resource/textures/earth_surface.jpg",function (texture) {
        earth_texture_material=new THREE.MeshBasicMaterial({
            map:texture
        })
    })
    //拾取射线
    raycaster=new THREE.Raycaster()
    mouse= new THREE.Vector2()


    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setClearColor(0x99cc00, 1);//设置底色
    renderer.setSize(window.innerWidth, window.innerHeight);//画布全屏
    document.body.appendChild(renderer.domElement);//画布元素加入document



    document.addEventListener('mousemove', onDocumentMouseMove, false)

    //
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

    scene = new THREE.Scene();


    //
    function setmatiral(object) {
        if (object.type==="Group"){
            for (var i=0;i<object.children.length;i++){
                setmatiral(object.children[i])
            }
        }else if (object.type==="Mesh"){
            object.material = new THREE.MeshLambertMaterial({color: 0x00ff00})
        }
    }

    var obj_loader=new THREE.OBJLoader()
    obj_loader.load("../resource/Airplanes.obj",function (object) {
        setmatiral(object)
        scene.add(object)
        console.log(object)
    })


    var text="N"
    var options={
        size:90,
        height:90,
        weight:"normal",
        font:"helvetiker",
        style:"normal",
        bevelThickness:2,
        bevelSize:4,
        bevelSegments:3,
        bevelEnabled:true,
        curveSegments:12,
        steps:1
    }
    console.log(new THREE.TextGeometry(text,options))
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(0,0,400)
    
//光源
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


    var radius = 300;
    var segments = 128;
    var rings = 128;


    //地球模型
    var geometry = new THREE.SphereGeometry(radius, segments, rings);//创建球体 半径/经/纬
    material_map = THREE.ImageUtils.loadTexture('../resource/textures/referee.png');//加载纹理
    material = new THREE.MeshLambertMaterial({
        map: material_map,
        color: 0xffffff
    });
    mesh = new THREE.Mesh(geometry, material);//创建球体模型
    // scene.add(mesh);//加载模型

    set_earth_material=function () {
        mesh.material=earth_texture_material
    }

    /*
     Tgeometry = new THREE.TorusGeometry(400, 0.1, 8, 64);
     Tmaterial = new THREE.MeshBasicMaterial({
     color: 0x00ff00
     });
     Tmesh = new THREE.Mesh(Tgeometry, Tmaterial);
     scene.add(Tmesh)
     */




//        cities_cylinder_rotate()
    //
    controls = new THREE.TrackballControls(camera, renderer.domElement);//
    controls.rotateSpeed = 4.0;


    window.addEventListener('resize', onWindowResize, false);//
}
//主程序
function animate() {
//        for ( var i = 0, l = tests.children.length; i < l; i ++ ) {


//        }

    //拾取判定
    raycaster.setFromCamera(mouse, camera);

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
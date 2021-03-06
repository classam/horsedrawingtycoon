
//var HORSEPICS_SERVER = "http://localhost:8080"
var HORSEPICS_SERVER = "http://hrse.pics/"

function horsecanvas(element, eventhandler){
    var canvas, stage;
    var context;
    var mode;

    var drawingCanvas;
    var oldPt;
    var oldMidPt;
    var color;
    var stroke;
    var stamps;
    var undo_queue;
    var undo_justclicked;
    var incanvas;
    var hitarea;

    canvas = element.find("canvas")[0];
    context = canvas.getContext("2d");
    incanvas = false;
    color = "#000000";
    mode = "stroke";
    stroke = 10;
    stamp_url = 'images/argy_bee.png';
    //check to see if we are running in a browser with touch support
    stage = new createjs.Stage(canvas);
    stage.autoClear = false;
    stage.enableDOMEvents(true);
    createjs.Touch.enable(stage);
    createjs.Ticker.setFPS(24);
    drawingCanvas = new createjs.Shape();
    stage.addChild(drawingCanvas);
    stamps = []
    undo_queue = []
    
    hitArea = new createjs.Shape();
    hitArea.graphics.beginFill("#000").drawRect(0, 0, canvas.width, canvas.height);

    function pushToUndoQueue(){
        undo_justclicked = false;
        var img = canvas.toDataURL("image/png");
        undo_queue.push(img);
        if (undo_queue.length > 10){
            undo_queue.shift();
        }
    }

    function handleMouseDown(event) {
        if( mode == 'stroke' && incanvas){
            oldPt = new createjs.Point(stage.mouseX, stage.mouseY);
            oldMidPt = oldPt;
            stage.addEventListener("stagemousemove" , handleMouseMove);
            drawingCanvas.graphics.clear()
                .setStrokeStyle(stroke, 'round', 'round')
                .beginStroke(color)
                .moveTo(oldPt.x, oldPt.y)
                .curveTo(oldPt.x, oldPt.y, oldMidPt.x, oldMidPt.y);
            stage.update();
        }
    }
    function handleMouseMove(event) {
        if(incanvas){
            var midPt = new createjs.Point(oldPt.x + stage.mouseX>>1, oldPt.y+stage.mouseY>>1);
            drawingCanvas.graphics.clear()
                .setStrokeStyle(stroke, 'round', 'round')
                .beginStroke(color)
                .moveTo(midPt.x, midPt.y)
                .curveTo(oldPt.x, oldPt.y, oldMidPt.x, oldMidPt.y);
            oldPt.x = stage.mouseX;
            oldPt.y = stage.mouseY;
            oldMidPt.x = midPt.x;
            oldMidPt.y = midPt.y;
            stage.update();
        }
    }
    function handleMouseUp(event) {
        if(mode == 'stroke'){
            stage.removeEventListener("stagemousemove" , handleMouseMove);
            if( incanvas ){
                pushToUndoQueue();
            }
        }
    }
    function handleClick(event) {
        if(mode == 'stamp' && incanvas){
            console.log("STAMPIN", stamp_url, stage.mouseX, stage.mouseY);
            var bitmap = new createjs.Bitmap(stamp_url);
            bitmap.x = stage.mouseX;
            bitmap.y = stage.mouseY;
            stage.addChild(bitmap);
            stage.update();
            stamps.push(stamp_url);
            eventhandler.emit("stamped", stamp_url);
            console.log("stamp click");
            pushToUndoQueue();
        }
    }
    
    // Global Event Handlers
    function changeColor(newcolor){
        console.log("change color:", newcolor);
        color = newcolor;
    }
    function changeSize(newsize){
        console.log("change size:", newsize);
        mode = 'stroke';
        stroke = newsize;
    }
    function completeCanvas(){
        var horsedollars = 1;
        var analysis = HorseRank.analyze(canvas, context);
        var colorhistogram = analysis.colorhistogram;
        for (var key in colorhistogram) {
            if (colorhistogram.hasOwnProperty(key) && key !== '#FFFFFF') {
                if( colorhistogram[key] > 40000 ){
                    horsedollars = horsedollars + 2;
                }
                else{
                    horsedollars = horsedollars + 1;
                }
            }
        }
        horsedollars = parseInt(horsedollars/3, 10);
        if (horsedollars > 9){
            horsedollars = 9;
        }
        console.log(analysis);
        console.log(horsedollars);
        var img = canvas.toDataURL("image/png");
        eventhandler.emit('showBreakdown', img, analysis, horsedollars, stamps);
        eventhandler.emit('newImage', img);
        eventhandler.emit('addMoney', horsedollars);
        eventhandler.emit('clearCanvas');
    }
    function clearCanvas(dont_clear_everything){
        console.log("clearing canvas");
        
        /* http://stackoverflow.com/questions/2142535/how-to-clear-the-canvas-for-redrawing */
        // Store the current transformation matrix
        context.save();

        // Use the identity matrix while clearing the canvas
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Restore the transform
        context.restore();

        stage.removeAllChildren();
        drawingCanvas = new createjs.Shape();
        drawingCanvas.hitArea = hitArea;
        drawingCanvas.on("click", handleClick);
        stage.addChild(drawingCanvas);
       
        if( dont_clear_everything === undefined ){
            stamps = [];
            undo_queue = [];
        }
    }
    function setStamp(url){
        console.log('stamp set');
        mode = 'stamp';
        stamp_url = url;
    }
    function setBackground(url){
        var image = new Image();
        image.src = url;
        image.onload = function(){
            drawingCanvas.graphics.clear()
                .beginBitmapFill(image)
                .drawRect(0, 0, canvas.width, canvas.height)
            stage.update();
        }
    }
    function undo(){
        console.log("undo!");
        if( !undo_justclicked ){
            undo_queue.pop();
            undo_justclicked = true;
        }
        if( undo_queue.length > 0 ){
            var q = undo_queue.pop();
            clearCanvas(true);
            setBackground(q);
        }
        else{
            clearCanvas();
        }
    }

    eventhandler.bind('changeColor', changeColor);
    eventhandler.bind('changeSize', changeSize);
    eventhandler.bind('clearCanvas', clearCanvas);
    eventhandler.bind('completeCanvas', completeCanvas);
    eventhandler.bind('setStamp', setStamp);
    eventhandler.bind('setBackground', setBackground);
    eventhandler.bind('undo', undo);

    stage.addEventListener("stagemousedown", handleMouseDown);
    stage.addEventListener("stagemouseup", handleMouseUp);
    drawingCanvas.hitArea = hitArea;
    drawingCanvas.on("click", handleClick);
    stage.update();

    $(element).find("#horse").mouseenter(function(){
        incanvas = true;
    });
    $(element).find("#horse").mouseleave(function(){
        incanvas = false;
    });
    
    $(element).find("#done").click(function(){
        eventhandler.emit("completeCanvas");
    });

    $(element).find("#clear").click(function(){
        eventhandler.emit("clearCanvas");
    });

    $(element).find("#undo").click(function(){
        eventhandler.emit("undo");
    });
}

function horsecursor(elem, emitter){
    function setBrushCursor(size){
        var adjust = parseInt(size/2);
        $(elem).css('cursor', 'url(images/brushes/'+size+'x'+size+'.png) '+adjust+' '+adjust+', auto');
    }

    function setStampCursor(stamp_url){
        $(elem).css('cursor', 'url('+stamp_url+'), auto');
    }

    emitter.bind('changeSize', setBrushCursor);
    emitter.bind('setStamp', setStampCursor);
}

function bin(element, emitter){
    var duration = 150;

    function selectBin(toggle, group){
        console.log("selectBin", toggle, group);
        $(element).find('.visible_bin').transition({x:"0px", width:"210px"}, duration, 'ease');
        setTimeout(function(){
            $("."+group).hide();
            $("."+toggle).show();
        }, duration);
        $(element).find('.visible_bin').transition({x:"200px", width:"110px"}, duration, 'ease');
    }

    function closeBin(){
        $(element).find('.visible_bin').transition({x:"0px", width:"210px"}, duration, 'ease');
    }
    emitter.on("selectBin", selectBin);
    emitter.on("closeBin", closeBin);
    
    $(element).find(".toggle").click(function(el){
        var toggle = $(el.target).data('toggle');
        if (toggle === undefined){
            toggle = $(el.target).parent().data('toggle');
        }
        var group = $(el.target).data('group');
        if (group === undefined){
            group = $(el.target).parent().data('group');
        }
        emitter.emit("selectBin", toggle, group);
    });
    
    $(".main").click(function(el){
        emitter.emit("closeBin")
    });
}

function currentColor(element, emitter){
    var changeColor = function(newcolor){
        $(element).css({"background-color":newcolor});
    }

    emitter.on("changeColor", changeColor);
}

function colorSelector(element, emitter){
    var source = $("#color-template").html();
    var template = Handlebars.compile(source);
    var lastSize = 10;

    var clickColor = function(el){
        emitter.emit("changeColor", $(el.target).data('color')) 
        emitter.emit("changeSize", lastSize)
        emitter.emit("closeBin")
    }
    
    var changeSize = function(size){
        lastSize = size;
    }
    
    var addColorRow = function(color1, color1_name, color2, color2_name, color3, color3_name){
        var color_row = template({'color1':color1, 
                                  'color1_name':color1_name,
                                  'color2':color2,
                                  'color2_name':color2_name,
                                  'color3':color3,
                                  'color3_name':color3_name});
        $(element).append($(color_row).click(clickColor));
    }
    
    emitter.on('changeSize', changeSize);
    emitter.on("addColorRow", addColorRow);

    $(element).find(".color").click(clickColor);
    
    $(element).find(".brush").click(function(el){
        var size = parseInt($(el.target).data('size'), 10);
        if ($(el.target).data('size') === undefined){
            size = parseInt($(el.target).parent().data('size'), 10);
        }
        console.log("brush clicked", size);
        emitter.emit("changeSize", size)
        emitter.emit("closeBin");
    });
}

function stampSelector(element, emitter){
    var source = $("#stamp-template").html();
    var template = Handlebars.compile(source);
    
    var clickStamp = function(el){
        emitter.emit("setStamp", $(el.target).data('url'));
        emitter.emit("closeBin")
    }

    var addStamp = function(url, title){
        var stamp_rendered = template({'url': url, 'title':title});
        $(element).append($(stamp_rendered).click(clickStamp));
    }

    emitter.on("addStamp", addStamp);

    $(element).find(".stamp").click(clickStamp);
}

function backgroundSelector(element, emitter){
    var source = $("#background-template").html();
    var template = Handlebars.compile(source);

    var clickBackground = function(el){
        emitter.emit("setBackground", $(el.target).data('url'));
        emitter.emit("closeBin")
    }

    var addBackground = function(url, title){
        var background_rendered = template({'url': url, 'title':title});
        $(element).append($(background_rendered).click(clickBackground));
    }

    emitter.on("addBackground", addBackground);
    
    $(element).find(".background").click(clickBackground);
}

function stableSelector(element, emitter){
    var source = $("#stable-template").html();
    var template = Handlebars.compile(source);

    var clickStable = function(el){
        if( $(el.target).data('url') !== undefined){
            emitter.emit("clearCanvas");
            emitter.emit("setBackground", $(el.target).data('url'));
        }
    }

    var deleteFromStable = function(el){
        var node = $($(el)[0].currentTarget).parent();
        var url = node.data('url');
        node.transition({'scale':0.1}, 500, 'ease');
        setTimeout(function(){node.hide()}, 500)
        emitter.emit("deleteImage", url);
    }

    var newImage = function(img){
        var img_rendered = template({'img': img});
        var node = $(img_rendered);
        node.click(clickStable);
        node.find('.trashstable').click(deleteFromStable);
        $(element).append(node);
    }

    emitter.on("newImage", newImage);
    $(element).find('.stable').click(clickStable);

}

function storeManager(element, emitter){
    var source = $("#store-template").html();
    var template = Handlebars.compile(source);
    
    var addItem = function( obj ){
        var id = obj['id'];
        var price = obj['price'];
        var name = obj['name'];
        var stamp_url = obj['stamp_url'];
        var stamp_name = obj['stamp_name'];
        var color1 = obj['color1'];
        var color1_name = obj['color1_name'];
        var color2 = obj['color2'];
        var color2_name = obj['color2_name'];
        var color3 = obj['color3']
        var color3_name = obj['color3_name'];
        var background_url = obj['background_url'];
        var background_name = obj['background_name'];

        var item_rendered = template(obj);
        $(element).append(item_rendered);
    }

    var update = function( money ){
        // each store_item, if price < money, show lock.  
        $.each(item_id_list, function(i, id){
            var element = $("#"+id);
            var record = items[id];
            if( record.price <= money ){
                element.find(".visible_when_available").show();
                element.find(".lock").hide();
            }
            else{
                element.find(".visible_when_available").hide();
                element.find(".lock").show();
            }
        });
    }

    var _pay = function(id){
        var record = items[id];
        emitter.emit("payMoney", record.price);
    }

    var _buy = function(id){
        var element = $("#"+id);
        var record = items[id];
        emitter.emit("addColorRow", record.color1, record.color1_name,
                                    record.color2, record.color2_name,
                                    record.color3, record.color3_name);
        emitter.emit("addStamp", record.stamp_url, record.stamp_name);
        emitter.emit("addBackground", record.background_url, record.background_name);
        element.transition({'scale':0.1}, 500, 'ease');
        setTimeout(function(){element.hide()}, 500)
    }

    var buy = function(id){
        _buy(id);
        _pay(id);
    }

    var buyWithoutPaying = function( id ){
        _buy(id);
    }

    emitter.on("buy", buy);
    emitter.on("buyWithoutPaying", buyWithoutPaying);
    emitter.on("update", update);

    $.each(item_id_list, function(i, id){
        addItem(items[id]);
    });
    update(0);
    
    $(element).find(".storebutton").click(function(el){
        emitter.emit("buy", $(el.target).data('id'));
    });
    
}

function chartModal(emitter){
    var source = $("#modal-template").html();
    var template = Handlebars.compile(source);

    var shoo = function( img, analysis, horsedollars ){
        $("#modal").transition({scale:'0.5'}, 500).transition({x:'-1700px'}, 500);
        setTimeout(function(){
            $("#modal").remove();
            $("#overlay").remove();
            }, 1200);
    }

    var showBreakdown = function( img, analysis, horsedollars, stamps ){
        var rendered_template = template({'img': img,
                                          'horsedollars': horsedollars});
        $('.main').append( rendered_template );
        var context = $('.horsechart')[0].getContext("2d");

        var colorhistogram = analysis.colorhistogram;
        var data = [];
        for (var key in colorhistogram) {
            if (colorhistogram.hasOwnProperty(key)) {
                data.push({
                    value:colorhistogram[key], 
                    color:key,
                    label:key,
                    highlight:key,
                });
            }
        }
        var newChart = new Chart(context).Doughnut(data, {});

        $("#modal").click(shoo);
        $("#overlay").click(shoo);

    }

    emitter.on('showBreakdown', showBreakdown);
}

function horseDollaDollaBill(element, emitter){
    var money = 0;

    var payMoney = function(amount){
        console.log("paying money", amount);
        money = money - amount;
        element.html(money);
        emitter.emit('update', money);

    }
    var addMoney = function(amount){
        console.log("adding money", amount);
        money = money + amount;
        element.html(money);
        emitter.emit('update', money);
    }
    var setMoney = function(amount){
        console.log("setmoney", amount);
        money = amount;
        element.html(money);
        emitter.emit('update', money);
    }

    emitter.on('payMoney', payMoney);
    emitter.on('addMoney', addMoney);
    emitter.on('setMoney', setMoney);
}

function stateRunRadio(element, emitter){
    // Save all events that change the page's state. 
    // replay them on page load. 
    var set = function(key,value){
        localStorage[key] = JSON.stringify(value);
    }
    var get = function(key){
        if(localStorage[key] !== undefined){
            return JSON.parse(localStorage[key]);
        }
        else{
            return undefined;
        }
    }

    var updateMoney = function(money){
        set('money', money);
    }
    var addPurchase = function(purchase){
        var purchases = get('purchases');
        if(purchases === undefined){
            purchases = [];
        }
        purchases.push(purchase)
        set('purchases', purchases);
    }
    var addImage = function(img){
        var images = get('images');
        if(images === undefined){
            images = [];
        }
        images.push(img);
        set('images', images);
    }
    var deleteImage = function(url){
        var images = get('images');
        if(images === undefined){
            return;
        }
        // this right here should be an expensive as hell operation
        var urlIndex = images.indexOf(url);
        if( urlIndex > -1 ){
            images.splice(urlIndex, 1);
        }
        set('images', images);
    }
    var addAchievement = function(image, title, msg, link){
        var achievements = get('achievements');
        if(achievements === undefined){
            achievements = [];
        }
        achievements.push({'image':image, 'title':title, 'msg':msg, 'link':link});
        set('achievements', achievements);
    }
    var reset = function(){
        set('money', 0);
        set('purchases', []);
        set('images', []);
        set('achievements', []);
        location.reload();
    }

    var all_undefined = true;

    var loadedMoney = get('money');
    if (loadedMoney !== undefined){
        all_undefined = false;
        console.log('setting money:', loadedMoney);
        emitter.emit('setMoney', loadedMoney);
    }
    var loadedPurchases = get('purchases');
    if (loadedPurchases !== undefined){
        all_undefined = false;
        $.each(loadedPurchases, function(i, purchase){
            emitter.emit('buyWithoutPaying', purchase);
        });
    }
    var loadedImages = get('images');
    if (loadedImages !== undefined){
        all_undefined = false;
        $.each(loadedImages, function(i, image){
            emitter.emit('newImage', image);
        });
    }
    var loadedAchievements = get('achievements');
    if (loadedAchievements !== undefined){
        all_undefined = false;
        $.each(loadedAchievements, function(i, achievement){
            emitter.emit('addAchievement', achievement.image, achievement.title, achievement.msg, achievement.link)
        });
    }

    if( all_undefined ){
        emitter.emit('message', 'images/messages/happy.png', 
                                'Welcome to HorseDrawingTycoon', 
                                'You should start by drawing a horse.',
                                'http://hrse.pics');
    }
    else{
        emitter.emit('message', 'images/messages/happy.png', 
                                'Welcome back!', 
                                'Draw more horses.',
                                'http://hrse.pics');
    }

    emitter.on('update', updateMoney);
    emitter.on('buy', addPurchase);
    emitter.on('newImage', addImage);
    emitter.on('deleteImage', deleteImage);
    emitter.on('addAchievement', addAchievement);
    emitter.on('reset', reset);

    element.click(reset);

}

function infinityHorse(emitter){
    var sendImage = function(img){
        $.ajax({
            url: HORSEPICS_SERVER, 
            type: "POST", 
            crossDomain: true,
            data: {image:img},
            success: function(response){
                console.log("SUCCESS");
                console.log(response);
                emitter.emit("message", 
                            "images/messages/link.png", 
                            "hrse.pics", 
                            "<a href='"+response+"' target='_blank'>Here's a link to your horse!</a> Share it with your friends!",
                            response);
            }
        });
    }

    emitter.on('newImage', sendImage);
}

function horseMessage(element, emitter){
    var source = $("#modal-message").html();
    var template = Handlebars.compile(source);

    var message = function(image, title, msg, link){
        console.log("message", image, title, msg, link);
        var rendered_template = template({
            'image': image,
            'title': title,
            'message': msg,
            'link': link,
        });
        rendered_template = $(rendered_template);
        element.append(rendered_template);
        rendered_template.transition({opacity:1}, 500, 'snap')
        setTimeout(function(){
            rendered_template.transition({opacity:0}, 3000, 'snap')
            setTimeout(function(){
                rendered_template.remove()
            }, 3000);
        }, 3000)
    }

    emitter.on('message', message);
}

function achievements(element, emitter){
    var source = $("#achievement-template").html();
    var template = Handlebars.compile(source);

    var achieved = [];

    var achieve = function(image, title, msg, link){
        if (achieved.indexOf(title) === -1){
            emitter.emit( 'message', image, "Achievement: "+title, msg, link );
            emitter.emit( 'addAchievement', image, title, msg, link );
            return true;
        }
        return false;
    }

    var lookAtBreakdown = function( img, analysis, horsedollars, stamps ){
        if (achieve("images/messages/number_one.png", 
                "First Horse Drawing",
                "draw one horse", 
                "https://www.youtube.com/watch?v=6zZlQ1WSn5U")){
            return;
        }

        if( analysis.dominant_color === '#000000' ){
            if( achieve("images/messages/red_door.png",
                    "I See A Red Door", 
                    "paint a horse with black as the dominant color",
                    "https://www.youtube.com/watch?v=u6d8eKvegLI")){
                return;
            }
        }
        if( analysis.secondary_color === '#000000' ){
            if( achieve("images/messages/dark_horse.png",
                    "Dark Horse",
                    "paint a horse with black as the secondary color",
                    "https://www.youtube.com/watch?v=sXJXLq1lN7U") ){
                return;
            }
        }
        if( analysis.dominant_color === '#FF0000' ){
            if( achieve("images/messages/red.png",
                    "Well Red",
                    "paint a horse with red as the dominant color",
                    "https://www.youtube.com/watch?v=1eJhAR5tQg0")){
                return;
            }
        }
        if( analysis.dominant_color === '#0000FF' ){
            if( achieve("images/messages/blue.png",
                    "Blue",
                    "paint a horse with blue as the dominant color",
                    "https://www.youtube.com/watch?v=_43cq3DalZw")){
                return;
            }
        }
        if( analysis.dominant_color === '#00FF00' ){
            if( achieve("images/messages/green.png",
                    "Green",
                    "paint a horse with green as the dominant color",
                    "https://www.youtube.com/watch?v=ndiD8V7zpAs")){
                return;
            }
        }
        if( Object.keys(analysis.colorhistogram).length > 8 &&
            analysis.dominant_color === "#FFFFFF" &&
            stamps.length === 0){
            if( achieve("images/messages/rainbow.png",
                    "Rainbow",
                    "use many different colours, no background, and no stamps",
                    "https://www.youtube.com/watch?v=ZJrXvuVi9ww")){
                return;
            }
        }
        if( analysis.dominant_color === "#999999" ){
            if( achieve("images/messages/derpy.png",
                    "Derpy",
                    "paint a horse with gray as the primary color",
                    "https://www.youtube.com/watch?v=XaRlNbVFlUA")){
                return;
            }
        }
        if( analysis.secondary_color === "#999999" ){
            if( achieve("images/messages/stupid_robot.png",
                    "Stupid Robot",
                    "paint a horse with grey as the secondary color",
                    "https://www.youtube.com/watch?v=ASoCJTYgYB0")){
                return;
            }
        }
        if( horsedollars === 9){
            if( achieve("images/messages/horsebux.png",
                    "Horse Dolla Dolla Bill", 
                    "draw a picture that's worth 9 HorseBux",
                    "https://www.youtube.com/watch?v=sXJXLq1lN7U")){
                return;
            }
        }
        if( horsedollars === 6){
            if( achieve("images/messages/six.png",
                    "Two Out of Three Ain't Bad",
                    "draw a picture that's worth 6 HorseBux",
                    "https://www.youtube.com/watch?v=k5hWWe-ts2s")){
                return;
            }
        }
        if( horsedollars === 5){
            if( achieve("images/messages/five.png",
                    "The Highest of Fives",
                    "draw a picture that's worth 5 HorseBux",
                    "https://www.youtube.com/watch?v=CZxen5QKwkE&t=9m50s")){
                return;
            }
        }
        if( horsedollars === 1){
             if( achieve("images/messages/one.png",
                    "The Loneliest Number",
                    "draw a picture that's worth 1 HorseBux",
                    "https://www.youtube.com/watch?v=22QYriWAF-U")){
                return;
             }
        }
        if( horsedollars === 0){
            if( achieve("images/messages/aw_no.png",
                    "The HorseRank Algorithm Taketh Away",
                    "draw a picture that's worth 0 HorseBux",
                    "https://www.youtube.com/watch?v=DN43sCyEanA")){
                return;
            }
        }
        if( stamps.length >= 20 ){
            if( achieve("images/messages/stampy.png",
                    "Attaboy, Stampy!",
                    "use more than 19 stamps in one image",
                    "https://www.youtube.com/watch?v=JoAiyUduyrY")){
                return;
            }
        }
        if( stamps.length >= 40 ){
            if( achieve("images/messages/stampy.png",
                    "STAMPEDE!",
                    "use more than 39 stamps in one image",
                    "https://www.youtube.com/watch?v=AaaBgDbKQhM")){
                return;
            }
        }
        if( stamps.length >= 60 ){
            if( achieve("images/messages/stampy.png",
                    "Too Many Stamps",
                    "seriously, cool it with the stamps. that's enough.",
                    "https://www.youtube.com/watch?v=WsepYhFqFfc")){
                return;
            }
        }
        if( stamps.indexOf('images/stamps/argy_bee.png') > 0 ){
            if( achieve("images/messages/bee.png",
                        "Bees! BEES!",
                        "Use the Argy Bee stamp.",
                        "https://www.youtube.com/watch?v=GNhoFaHU3_A") ){
                return;
            }
        }
        if( stamps.indexOf('images/stamps/bow.png') > 0 ){
            if( achieve("images/messages/whoa.png",
                        "The Prettiest Girl in Brooklyn.",
                        "Use the most expensive stamp in the game.",
                        "https://www.youtube.com/watch?v=rFWb7DG7zTc") ){
                return;
            }
        }
    }

    var addAchievement = function( image, title, msg, link ){
        console.log("achievement", image, title, msg, link);
        achieved.push(title);
        var rendered_template = template({
            'image': image,
            'title': title,
            'message': msg,
            'link': link,
        });
        rendered_template = $(rendered_template);
        element.append(rendered_template);
    }

    emitter.on('showBreakdown', lookAtBreakdown)
    emitter.on('addAchievement', addAchievement)
}

$(function() {
    var emitter = new LucidJS.EventEmitter();
    
    horsecanvas($('.main'), emitter);
    horsecursor($('#horse'), emitter);

    bin($('.left'), emitter);
    currentColor($('.current_color'), emitter);
    colorSelector($('.colors'), emitter);
    stampSelector($('.stamps'), emitter);
    backgroundSelector($('.backgrounds'), emitter);
    stableSelector($('.stables'), emitter);
    storeManager($('.store'), emitter);
    horseDollaDollaBill($('.horsecounter'), emitter);
    achievements($('.achievements'), emitter);
    chartModal(emitter);
    horseMessage($(".messages"), emitter);
    stateRunRadio($(".reset"), emitter);
    infinityHorse(emitter);
    
    emitter.emit("changeSize", 10);
    emitter.emit("setBackground", "images/backgrounds/photoshop.png");

});


/**
 * 
 * @authors Phelps Chou
 * @date    2017-01-11 07:47:58
 * @version $Id$
 */

// 获取音乐模块
var getMusic = (function(){

 	function GetMusic($node){
 		this.$ct = $node;

 		this.init();
 		this.bind();
 	}

 	GetMusic.prototype.init = function(){
 		this.$channels = this.$ct.find('.channels');
 		this.$channelBtn = this.$ct.find('.channel-btn');
   		this.$channelsList = this.$ct.find('.channels-list');

   		this.$audio = $("#music");
   		this.audio = $("#music").get(0);

   		this.Song = {};  // 获取的歌曲对象
   		this.SongArr = [];  // 用于保存歌曲，可以读取上一首

   		this.letsPlay = false;  //设置状态锁，控制是否播放，不加锁则歌曲加载完后会自动播放

   		this.$songName = this.$ct.find('.title .song-name');
   		this.$singer = this.$ct.find('.title .singer');

   		this.$onoff = this.$ct.find('.on-off');
   		this.$prev = this.$ct.find('.icon-shangyishou');
    	this.$next = this.$ct.find('.icon-xiayishou');

   		this.$needle = this.$ct.find('.main .needle');
   		this.$disco = this.$ct.find('.main .disco');
   		this.$cover = this.$ct.find('.current-cover');

    	this.islyricShow = false;
    	this.lyricTimeArr = [];  //用于保存每句歌词对应的秒数
        this.currentTimeSec = 0;
   		this.$lyricBtn = this.$ct.find('.lyric-btn');
   		this.$lyric = this.$ct.find('.lyric');
   		this.$cd = this.$ct.find('.cd-play');
   		this.$lyricBox = this.$ct.find('.lyric-box');
 	};

 	GetMusic.prototype.bind = function(){
 		this.channelsIconChange();
 		this.getChannels();
 		this.channelSelect();

 		this.canPlay();
    	this.autoPlay(); 

    	this.onOff();
    	this.prevSong();
    	this.nextSong();

    	this.needleChange();
 		this.rotateCtrl();

    	this.lyricShow();
    	this.timeUpdate();
 	};

 	// 频道列表打开关闭
 	GetMusic.prototype.channelsIconChange = function(){
 		var self = this;
 		this.$channels.on('mouseover', function(){
 			// 先stop立即停止执行当前动画，然后接着做动画，防止频繁触发
			self.$channelsList.stop().fadeIn(500);
			self.$channelBtn.removeClass('icon-liebiao').addClass('icon-arrow-cross');
		});
		this.$channels.on('mouseleave', function(){
			self.$channelsList.stop().fadeOut(500);
			self.$channelBtn.removeClass('icon-arrow-cross').addClass('icon-liebiao');
		});
 	};

	// 获取频道列表
 	GetMusic.prototype.getChannels = function(){
    	var self = this;
		$.get('http://api.jirengu.com/fm/getChannels.php').done(function(channelsStr) {
			//服务器返回的是一个符合JSON语法的字符串
			//console.log(channelsStr);  
			//变为频道列表的数组，成员是所有列表项，包含name和channel_id的对象
	        var channelsArr = JSON.parse(channelsStr).channels;
			//console.log(channelsArr);

	        //遍历数组对象，获取频道列表，添加到html中
	        for (var i = 0; i < channelsArr.length; i++) {
	            var channelName = channelsArr[i].name;
	            var channelID = channelsArr[i].channel_id;
	            self.channelId = channelsArr[0].channel_id;
	            var html = '<li channel-id="' + channelID + '">' + channelName + '</li>';
	            $(".header .channels ul").append(html);
	        }
	        $('.channels ul li').first().addClass('list-selected');
	        self.getAndReset(self.channelId);  //获取到列表后会用列表第一项初始化歌曲
            self.$disco.addClass('active');
            self.$disco.css('animation-play-state', 'paused');
	    });
 	};

 	// 选择频道列表
 	GetMusic.prototype.channelSelect = function(){
 		var self = this;
 		//使用事件代理，将事件监听绑定在父容器上
 		this.$channelsList.on('click', 'li', function(){  
        	self.audio.pause();
 			$(this).siblings().removeClass('list-selected');
        	$(this).addClass('list-selected');
        	self.channelId = $(this).attr('channel-id');  //点击会将绑定的channelId变为相应值
        	self.letsPlay = true;  //只要点击了频道，打开锁，保证canplay事件触发后能直接播放
        	self.getAndReset(self.channelId);  //点击会触发重新获取并设置歌曲函数
 		});
 	};

	// 根据得到的频道信息，获取对应随机歌曲
 	GetMusic.prototype.getAndReset = function(str) {  //参数为发送给服务器的数据，这里应该为channel的ID
 		var self = this;
	    $.get('http://api.jirengu.com/fm/getSong.php', {channel: str}).done(function(song) {
	        self.Song = JSON.parse(song).song[0];  // 将返回的信息变成一个包含歌曲信息的对象
	        self.songReset(self.Song);
	        self.SongArr.push(self.Song);  //将播放的歌曲保存在一个数组中，上一曲可以取到
	    });
	};

	// 根据得到的歌曲对象，渲染到面板
	GetMusic.prototype.songReset = function(songInfo) {
	    this.audio.src = songInfo.url;
	    this.$songName.text(songInfo.title);
	    this.$singer.text(songInfo.artist);
	    this.$cover.css('background-image', 'url("' + songInfo.picture + '")');
	    //this.audio.load();  // 重新加载音频元素
	    // this.audio.currentTime = 0;
	    this.lyricReset(songInfo.sid);
	};

 	// 数据足够时触发事件，播放已加载的歌曲
 	GetMusic.prototype.canPlay = function() {
	    var self = this;
	    // canplay 在媒体数据已经有足够的数据（至少播放数帧）可供播放时触发
	    this.$audio.on('canplay', function() {
	        if (self.letsPlay) {  //这里如果没有锁则当歌曲加载完会自动播放
	            self.audio.play();
	        };
	        self.letsPlay = false;  //将锁状态还原
	    });
	};

	// 播放结束后触发事件，自动播放下一首
	GetMusic.prototype.autoPlay = function() {
	    var self = this;
	    // ended 播放结束时触发
	    this.$audio.on('ended', function() {
	        self.letsPlay = true;  //播放结束时，打开锁，保证canplay事件触发后能直接播放
	        self.getAndReset(self.channelId);
	    });
	};


	
	// 播放暂停功能
	GetMusic.prototype.onOff = function() {
	    var self = this;
	    this.$onoff.on('click', function() {
	        if (self.audio.paused) { // 暂停播放的时候
	            self.audio.play();
	            if (self.$onoff.hasClass('icon-bofang')) {
	                self.$onoff.removeClass('icon-bofang');
	            }
            	self.$onoff.addClass('icon-zanting');
	        } else {
	            self.audio.pause();
	            if (self.$onoff.hasClass('icon-zanting')) {
	                self.$onoff.removeClass('icon-zanting');
	            }
            	self.$onoff.addClass('icon-bofang');
	        }
	    });
	    this.$audio.on('play', function() {
	        if (self.$onoff.hasClass('icon-bofang')) {
	            self.$onoff.removeClass('icon-bofang');
	        }
        	self.$onoff.addClass('icon-zanting');
	    });
	    this.$audio.on('pause', function() {
	        if (self.$onoff.hasClass('icon-zanting')) {
	            self.$onoff.removeClass('icon-zanting');
	        }
        	self.$onoff.addClass('icon-bofang');
	    });
	};

	//上一曲，直接在原来保存的数组里面拿数据
	GetMusic.prototype.prevSong = function(){
		var self = this;
		this.$prev.on('mousedown', function() {
	        self.audio.pause();
	    });		
		this.$prev.on('click', function(){
			if(self.SongArr.length>1){
            	self.letsPlay = true;  //点击上一曲后，打开锁，保证canplay事件触发后能直接播放				
				self.SongArr.pop();
            	self.songReset(self.SongArr[self.SongArr.length - 1]);
			}
		});
	};

	//下一曲，发送请求给服务器，返回随机歌曲信息
	GetMusic.prototype.nextSong = function(){
		var self = this;
		this.$next.on('mousedown', function() {
	        self.audio.pause();
	    });
		this.$next.on('click', function(){
        	self.letsPlay = true;  //点击下一曲后，打开锁，保证canplay事件触发后能直接播放
			self.getAndReset(self.channelId);
		});
	};



	// 唱针状态控制
 	GetMusic.prototype.needleChange = function(){
 		var self = this;
	    this.$audio.on('play', function() {
	        self.$needle.addClass('needle-play');
	    });
	    this.$audio.on('pause', function() {
	        self.$needle.removeClass('needle-play');
	    });
 	};

 	// 黑胶旋转控制
 	GetMusic.prototype.rotateCtrl = function(){
 		var self = this;
 		this.$audio.on('play', function() {
 			// 该属性规定动画正在运行还是暂停，如果直接控制active会出现跳动
        	self.$disco.css('animation-play-state', 'running');
	    });
	    this.$audio.on('pause', function() {
        	self.$disco.css('animation-play-state', 'paused');
	    });
 	};



 	// 歌词 显示/隐藏 切换
	GetMusic.prototype.lyricShow = function() {
	    var self = this;
	    this.$lyricBtn.on('click', function() {
	        if (!self.islyricShow) {
	            self.$lyricBtn.css('color', '#db4437');
	            self.$lyric.stop().fadeIn(500);
	            self.$cd.stop().fadeOut(500);
	            self.islyricShow = true;
	        } else {
	            self.$lyricBtn.css('color', 'rgba(170, 170, 170, 0.7)');
	            self.$cd.stop().fadeIn(500);
	            self.$lyric.stop().fadeOut(500);
	            self.islyricShow = false;
	        }
	    });
	};

	// 根据歌曲信息，获取相应歌词
	GetMusic.prototype.lyricReset = function(sidstr) {
	    var self = this;
	    $.post('http://api.jirengu.com/fm/getLyric.php', {sid: sidstr}).done(function(lyric) {
            var Lyric = JSON.parse(lyric).lyric;
            //console.log(Lyric);  //得到一个歌词字符串
            $('.lyric-box>p').remove();
            self.lyricTimeArr = [];
            self.lyricFormat(Lyric);
	    });
	};

	//歌词格式化，添加到页面
	GetMusic.prototype.lyricFormat = function(str) {
	    var html = '';
	    var lyricArr = str.split('\n');
	    // console.log(lyricArr);
	    for (var i = 0; i < lyricArr.length; i++) {
	    	// 将数组成员前面的所有中括号去掉
	        // var lyric = lyricArr[i].replace(/\[.*\]/g, '');
	        var lyric = lyricArr[i].slice(10,48);
	    	// console.log(lyric);
	        if (!lyric) {
	            lyric = '----';
	        };
	        html += '<p class=' + '"lyric' + i + '">' + lyric + '</p>';
	        this.lyricTimeFormat(lyricArr[i]);
	    }
	    this.$lyricBox.append(html);
	};


	// 每句歌词对应的时间格式化为秒数，并保存
	GetMusic.prototype.lyricTimeFormat = function(str) {
	    var min = parseFloat(str.slice(1, 3));
	    var sec = Math.round(min * 60 + parseFloat(str.slice(4, 9)));
	    this.lyricTimeArr.push(sec);
	    // console.log(this.lyricTimeArr);
	};

	GetMusic.prototype.timeUpdate = function() {
	    var self = this;
	    // 当currentTime更新时会触发timeupdate事件
	    this.$audio.on('timeupdate', function() {
	        if (self.currentTimeSec != Math.round(self.audio.currentTime)) {
	            self.currentTimeSec = Math.round(self.audio.currentTime);
	            self.lyricBoxMove(self.currentTimeSec);
	        }
	    });
	};

	// 歌词盒子随着时间变化向上抽动
	GetMusic.prototype.lyricBoxMove = function(num) {
	    for (var i = 1; i < this.lyricTimeArr.length; i++) {
	    	// 当发现num和数组中的哪条歌词时间相同时，代表要动作了，那么就执行条件语句
	        if (num === this.lyricTimeArr[i]) {
	            var Top = 80 - i * 40 + 'px';  //盒子原来top值，抽动 行高*i，就是最终的top值
	            var lightClass = '.lyric' + i;
	            $(lightClass).siblings().removeClass('light-lyric');
	            $(lightClass).addClass('light-lyric');
	            this.$lyricBox.animate({
	                top: Top
	            }, 300);
	        }
	    }
	};

 	return new GetMusic( $('.panel') );
})();


// 大小面板切换控制模块
var panelCtrl = (function(){

	function PanelCtrl($node){
		this.$ct = $node;

		this.init();
		this.bind();
	}

	PanelCtrl.prototype.init = function(){
		this.$audio = this.$ct.find('#music');

		this.$panelOpen = this.$ct.find('.panel-min');
    	this.$panel = this.$ct.find('.panel');
    	this.$panelClose = this.$ct.find('.small-fm');

    	this.isMoving = false;  // 设置状态锁

	    this.$drag = this.$ct.draggabilly({
	        handle: '.panel-handle'  // 设置句柄，指定拖曳元素
	    });
	};

	PanelCtrl.prototype.bind = function(){
		this.openPanel();
		this.closePanel();
		this.stateChange();
	};

	// 小图标的状态切换
	PanelCtrl.prototype.stateChange = function(){
		var self = this;
		this.$audio.on('play', function() {
	        self.$panelOpen.addClass('rotate-min');
	    });
	    this.$audio.on('pause', function() {
	        self.$panelOpen.removeClass('rotate-min');
	    });
	};

	// 打开面板
	PanelCtrl.prototype.openPanel = function(){
		var self = this;

		// 在drag对象上鼠标按下触发 pointerDown 事件
		this.$drag.on('pointerDown', function() {
	        self.isMoving = true;
	    });

		// drag对象移动结束触发 dragEnd 事件
	    this.$drag.on('dragEnd', function() {
	        self.isMoving = false;
	    });

	    // 如果是静态点击则触发 click 事件
		this.$panelOpen.on('click', function(){
			if (self.isMoving) {
	            self.$panelOpen.fadeOut(300);
	            self.$panel.fadeIn(300);
	            self.isMoving = false;
	        }
	    });
	};

	// 关闭面板
	PanelCtrl.prototype.closePanel = function(){
		var self = this;
		this.$panelClose.on('click', function(){
			self.$panelOpen.fadeIn(300);
        	self.$panel.fadeOut(300);
		});
	};

 	return new PanelCtrl( $('#fm') );
})();


// 歌曲进度条控制模块
var ProgressCtrl = (function(){

	function ProgressCtrl($node){
	    this.$ct = $node;

		this.init();
		this.bind();
	}

	ProgressCtrl.prototype.init = function(){
	    this.$FM = $('#fm');

	    this.$audio = $('#music');
	    this.audio = $('#music').get(0);

	    this.$progress = this.$ct;
	    this.$progressBar = this.$ct.find('.progress-bar');
    	this.$progressPathway = this.$ct.find('.progress-pathway');
	    this.$progressLine = this.$ct.find('.progress-line');
	    this.$progressHandle = this.$ct.find('.progress-handle');

	    this.$currentTime = this.$ct.find('.current-time');
	    this.$fullTime = this.$ct.find('.full-time');

	    this.clock1;

	    // 设置句柄，控制拖曳
	    this.drag = this.$progressHandle.draggabilly({
	        axis: 'x',  // 约束水平移动方向
	        containment: true  // 其父元素为包含元素，控制拖动范围
	    });	
	};

	ProgressCtrl.prototype.bind = function(){
	    this.dragCtrl();
	    this.clickCtrl();
	    this.timeText();
	};

	// 拖曳控制歌曲进度
	ProgressCtrl.prototype.dragCtrl = function(){
	    var self = this;
	    this.drag.on('dragMove', function() {
	    	// 从对应的jQuery对象获取 Draggabilly 的实例，用来访问Draggabilly的属性
	        var draggie = $(this).data('draggabilly');
	        // 访问Draggabilly属性
	        // console.log( 'draggie at ' + draggie.position.x + ', ' + draggie.position.y );

	        var widthX = draggie.position.x + 'px';
	        // 控制progressLine样式的联动
	        self.$progressLine.css('width', widthX);
	    });

	    // 拖曳开始，触发dragStart事件，停止播放音频
	    this.drag.on('dragStart', function() {
	        self.audio.pause();
	    });
	    // 拖曳结束，触发dragEnd事件，开始播放音频，设置时间
	    this.drag.on('dragEnd', function() {
	        self.audio.play();
	        var draggie = $(this).data('draggabilly');

	        // 结束位置对应的时间
	        self.audio.currentTime = draggie.position.x / 200 * self.audio.duration;
	    });
	};

	// 点击控制歌曲进度
	ProgressCtrl.prototype.clickCtrl = function(){
		var self = this;
		// 事件会在冒泡时触发，所以点击到子元素同样会触发
	    this.$progressBar.on('click', function(event) {
	    	// 点击点横坐标
	        var clickX = event.clientX;
	        // 进度条距离客户端左边距离
	        var barLeft = self.toLength(self.$progressBar.css('left'))
	        			+ self.toLength(self.$progress.css('left')) 
	        			+ self.toLength(self.$FM.css('left'));
	        var halfWidth = self.toLength(self.$progressHandle.css('width'))/2;
	        // 所以可以获取点击点progressLine的宽度			
	        var left = clickX - barLeft - halfWidth;

	        self.$progressLine.width(left);
	        self.$progressHandle.css('left', left);

	        // 结束位置对应的时间
	        self.audio.currentTime = left / 200 * self.audio.duration;
	    });
	};

	
	// 时长和进度条动作
	ProgressCtrl.prototype.timeText = function(){
		var self = this;
		// 音频播放进度条前进，时间改变
	    this.$audio.on('play', function() {
	    	// 返回音频长度数值，以秒计
	        var fullTime = self.audio.duration;
	        self.clock1 = setInterval(function() {
	    		// 返回音频当前播放值，以秒计
	            var currentTime = self.audio.currentTime;
	            var currentWidth = parseInt(currentTime / fullTime * 200) + 'px';

	            self.$currentTime.text(self.timeFormat(currentTime));
	            self.$progressLine.width(currentWidth);
	            self.$progressHandle.css('left', currentWidth)
	        }, 1000);
	        self.$fullTime.text(self.timeFormat(fullTime));
	    });
	    this.$audio.on('pause', function() {
	        clearInterval(self.clock1);
	    });
	};

	// 将数值格式化为时间
	ProgressCtrl.prototype.timeFormat = function(num){
	    var fullSeconds = parseInt(num);
	    var minutes = parseInt(fullSeconds / 60) + '';
	    var seconds = fullSeconds % 60;
	    if (seconds < 10) {
	        seconds = '0' + seconds;
	    } else {
	        seconds = seconds + '';
	    }
	    var timeStr = minutes + ':' + seconds;
	    return timeStr;
	};

	ProgressCtrl.prototype.toLength = function(str){
		var num = parseInt( str.replace('px', '') );
		return num;
	};

	return new ProgressCtrl( $('.progress') );
})();


// 音量控制模块
var volumeCtrl = (function(){

	function VolumeCtrl($node) {
	    this.$ct = $node;

	    this.init();
	    this.bind();
	}

	VolumeCtrl.prototype.init = function(){
    	this.$FM = $('#fm');

    	this.$audio = $('#music');
    	this.audio = $('#music').get(0);

    	this.$volume = this.$ct;
		this.$volumeButton = this.$ct.find('.volume-button');
		this.$volumeBar = this.$ct.find('.volume-bar');
		this.$volumeLine = this.$ct.find('.volume-line');
		this.$volumeHandle = this.$ct.find('.volume-handle');

		// 设置状态锁
	    this.volumeOn = true;

	    // 设置句柄，控制拖曳
	    this.dragVolume = this.$volumeHandle.draggabilly({
	        axis: 'x',  // 约束水平移动方向
	        containment: true  // 其父元素为包含元素，控制拖动范围
	    });
	};

	VolumeCtrl.prototype.bind = function(){
		this.volumeChange();
		this.switchMute();
		this.dragCtrl();
		this.clickCtrl();
	};

	// 音量改变事件
	VolumeCtrl.prototype.volumeChange = function(){
		var self = this;
		// 在音频音量改变时触发（既可以是volume属性改变，也可以是muted属性改变）
    	this.$audio.on('volumechange', function(){
    		// self.audio.volume值从0.0到1.1
    		var audioChanged = self.audio.volume*100;
    		var width = audioChanged + 'px';
    		self.$volumeLine.css('width',width);
    		if (audioChanged === 0) {
	            self.volumeOn = false;
	            self.$volumeButton.removeClass('icon-shengyin').addClass('icon-jingyin');
	        } else {
	            if (self.$volumeButton.hasClass('icon-jingyin')) {
	                self.volumeOn = true;
	                self.$volumeButton.removeClass('icon-jingyin').addClass('icon-shengyin');
	            }
	        }
    	});
	};

	// 点击按钮切换静音
	VolumeCtrl.prototype.switchMute = function(){
		var self = this;
		this.$volumeButton.on('click', function(){
			if (self.volumeOn) {
	            self.audioVolume = self.audio.volume;
	            self.audio.volume = 0;
	            self.$volumeHandle.css('left', '-100px')
	        } else {
	            self.audio.volume = self.audioVolume;
	            var left = self.audioVolume * 100 - 100 + 'px';
	            self.$volumeHandle.css('left', left);
	        }
		});
	};

	// 拖动控制音量
	VolumeCtrl.prototype.dragCtrl = function(){
		var self = this;
		this.dragVolume.on('dragMove', function() {
	        var draggie = $(this).data('draggabilly');
	        var width = 100 + draggie.position.x;
	        if (width !== 0) {
	            self.audio.volume = width / 100;
	        } else {
	            self.audio.volume = 0;
	        }
	    });
	};

	// 点击控制音量
	VolumeCtrl.prototype.clickCtrl = function(){
		var self = this;
		this.$volumeBar.on('click', function(event){
			var clickX = event.clientX;
        	var barLeft = self.toLength(self.$volumeBar.css('left')) 
        				+ self.toLength(self.$volume.css('left')) 
        				+ self.toLength(self.$FM.css('left'));
			var clickVolume = clickX - barLeft - 3;
			if (clickVolume <= 100) {
	            self.audio.volume = clickVolume / 100;
	            var left = clickVolume - 100 + 'px';
	            self.$volumeHandle.css('left', left);
	        } else {
	            self.audio.volume = 1;
	            self.$volumeHandle.css('left', '0px');
	        }
		});
	};

	VolumeCtrl.prototype.toLength = function(str) {
	    var num = parseInt( str.replace('px', '') );
	    return num;
	}

 	return new VolumeCtrl( $('.volume') );
})();
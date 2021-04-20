window.onload = function(){
	//ローディング画面のDOM要素を所得
	const spinner = document.getElementById('loading');

  //タッチイベントが利用可能かどうかの判別
	var supportTouch = 'ontouchend' in document;

	//イベント名の決定
	const EVENTNAME_START = supportTouch? 'touchstart':'mousedown';
	const EVENTNAME_MOVE = supportTouch? 'touchmove':'mousemove';
	const EVENTNAME_END = supportTouch? 'touchend':'mouseup';

  // Get a reference to the database service
  var database = firebase.database();

	//Vueインスタンスが存在するかどうかを判別するフラグ
	var first = true;

	//更新内容を一時保存する変数
	var updates = {};

	function renewDB(update_set){
		//update_setは、行われたDOM操作に関して記録したリストとする
		if(update_set != {}){
			console.log("DB update");
			database.ref("/student/AnimationClip").update(update_set);
			//updatesを初期化
			updates = {};
		};
	};

	//Vueインスタンスをいれる変数
	//インスタンス外部からメソッドを呼ぶのに利用する
	var vm;

  function createV(fss){
    vm = new Vue({
      el:"#app",
      data:{
        canvas:       				0,
				//時間バーの値を保持
				bar_value:						0,
				//選ばれた部位を保持
				selected_parts_name:	0,
				selected_parts:				0,
				//角度バーに反映された直後の値を保持
				selected_parts_rotX:	0,
				selected_parts_rotY:	0,
				selected_parts_rotZ:	0,
				//部位が選択された時のrotationを角度バーに反映
				rotationX_bar:				0,
				rotationY_bar:				0,
				rotationZ_bar:				0,
        scene:        				new THREE.Scene(),
        renderer:     				new THREE.WebGLRenderer({anitialias: true}),
        camera:       				new THREE.PerspectiveCamera(45,1,1,10000),
        controls:     				0,
        light:        				new THREE.DirectionalLight(0xFFFFFF, 1),
				//再生用のhuman(その他の部位も)
        human:        				new THREE.Group(),
				//編集用のhuman
				human_clone:					0,
				//キーフレームトラックを保持(データベースとのデータ共有に使用)
				keyframetracks:				[],
        //アニメーションクリップを保持(データベースとのデータ共有に使用)
        clips:        				[],
				//ミキサーを保持(アニメーション実行に使用)
				mixers:								[],
        //アニメーションアクションを保持(アニメーション実行に使用)
        actions:      				[],
				//再生時にactionsをリセットする必要があるかのチェックをするフラグ
				reset_flag:						false,
        eventstart:   				EVENTNAME_START,
        eventmove:    				EVENTNAME_MOVE,
        eventend:     				EVENTNAME_END
      },
      methods:{
				//データが変更された時実行する
        changed_DB_bySomeone:function(ss){
					console.log("change DB");

					//humanに対するアニメーションを停止
					this.actions[0].stop();
					this.actions[1].stop();
					this.actions[2].stop();
					this.actions[3].stop();
					this.actions[4].stop();

					//更新されたデータ(ss.child().val)をkeyframetracksに反映させる
					//clips,mixers,actionsも作り直す
					this.keyframetracks[0].times = ss.child('AnimationClip/body/x/times').val();
					this.keyframetracks[0].values = ss.child('AnimationClip/body/x/values').val();
					this.keyframetracks[1].times = ss.child('AnimationClip/body/y/times').val();
					this.keyframetracks[1].values = ss.child('AnimationClip/body/y/values').val();
					this.keyframetracks[2].times = ss.child('AnimationClip/body/z/times').val();
					this.keyframetracks[2].values = ss.child('AnimationClip/body/z/values').val();

					this.keyframetracks[3].times = ss.child('AnimationClip/right_arm_1/x/times').val();
					this.keyframetracks[3].values = ss.child('AnimationClip/right_arm_1/x/values').val();
					this.keyframetracks[4].times = ss.child('AnimationClip/right_arm_1/y/times').val();
					this.keyframetracks[4].values = ss.child('AnimationClip/right_arm_1/y/values').val();
					this.keyframetracks[5].times = ss.child('AnimationClip/right_arm_1/z/times').val();
					this.keyframetracks[5].values = ss.child('AnimationClip/right_arm_1/z/values').val();

					this.keyframetracks[6].times = ss.child('AnimationClip/right_arm_2/x/times').val();
					this.keyframetracks[6].values = ss.child('AnimationClip/right_arm_2/x/values').val();
					this.keyframetracks[7].times = ss.child('AnimationClip/right_arm_2/y/times').val();
					this.keyframetracks[7].values = ss.child('AnimationClip/right_arm_2/y/values').val();
					this.keyframetracks[8].times = ss.child('AnimationClip/right_arm_2/z/times').val();
					this.keyframetracks[8].values = ss.child('AnimationClip/right_arm_2/z/values').val();

					this.keyframetracks[9].times = ss.child('AnimationClip/left_arm_1/x/times').val();
					this.keyframetracks[9].values = ss.child('AnimationClip/left_arm_1/x/values').val();
					this.keyframetracks[10].times = ss.child('AnimationClip/left_arm_1/y/times').val();
					this.keyframetracks[10].values = ss.child('AnimationClip/left_arm_1/y/values').val();
					this.keyframetracks[11].times = ss.child('AnimationClip/left_arm_1/z/times').val();
					this.keyframetracks[11].values = ss.child('AnimationClip/left_arm_1/z/values').val();

					this.keyframetracks[12].times = ss.child('AnimationClip/left_arm_2/x/times').val();
					this.keyframetracks[12].values = ss.child('AnimationClip/left_arm_2/x/values').val();
					this.keyframetracks[13].times = ss.child('AnimationClip/left_arm_2/y/times').val();
					this.keyframetracks[13].values = ss.child('AnimationClip/left_arm_2/y/values').val();
					this.keyframetracks[14].times = ss.child('AnimationClip/left_arm_2/z/times').val();
					this.keyframetracks[14].values = ss.child('AnimationClip/left_arm_2/z/values').val();

					this.keyframetracks[15].times = ss.child('AnimationClip/waist/x/times').val();
					this.keyframetracks[15].values = ss.child('AnimationClip/waist/x/values').val();
					this.keyframetracks[16].times = ss.child('AnimationClip/waist/y/times').val();
					this.keyframetracks[16].values = ss.child('AnimationClip/waist/y/values').val();
					this.keyframetracks[17].times = ss.child('AnimationClip/waist/z/times').val();
					this.keyframetracks[17].values = ss.child('AnimationClip/waist/z/values').val();

					this.keyframetracks[18].times = ss.child('AnimationClip/right_foot_1/x/times').val();
					this.keyframetracks[18].values = ss.child('AnimationClip/right_foot_1/x/values').val();
					this.keyframetracks[19].times = ss.child('AnimationClip/right_foot_1/y/times').val();
					this.keyframetracks[19].values = ss.child('AnimationClip/right_foot_1/y/values').val();
					this.keyframetracks[20].times = ss.child('AnimationClip/right_foot_1/z/times').val();
					this.keyframetracks[20].values = ss.child('AnimationClip/right_foot_1/z/values').val();

					this.keyframetracks[21].times = ss.child('AnimationClip/right_foot_2/x/times').val();
					this.keyframetracks[21].values = ss.child('AnimationClip/right_foot_2/x/values').val();
					this.keyframetracks[22].times = ss.child('AnimationClip/right_foot_2/y/times').val();
					this.keyframetracks[22].values = ss.child('AnimationClip/right_foot_2/y/values').val();
					this.keyframetracks[23].times = ss.child('AnimationClip/right_foot_2/z/times').val();
					this.keyframetracks[23].values = ss.child('AnimationClip/right_foot_2/z/values').val();

					this.keyframetracks[24].times = ss.child('AnimationClip/left_foot_1/x/times').val();
					this.keyframetracks[24].values = ss.child('AnimationClip/left_foot_1/x/values').val();
					this.keyframetracks[25].times = ss.child('AnimationClip/left_foot_1/y/times').val();
					this.keyframetracks[25].values = ss.child('AnimationClip/left_foot_1/y/values').val();
					this.keyframetracks[26].times = ss.child('AnimationClip/left_foot_1/z/times').val();
					this.keyframetracks[26].values = ss.child('AnimationClip/left_foot_1/z/values').val();

					this.keyframetracks[27].times = ss.child('AnimationClip/left_foot_2/x/times').val();
					this.keyframetracks[27].values = ss.child('AnimationClip/left_foot_2/x/values').val();
					this.keyframetracks[28].times = ss.child('AnimationClip/left_foot_2/y/times').val();
					this.keyframetracks[28].values = ss.child('AnimationClip/left_foot_2/y/values').val();
					this.keyframetracks[29].times = ss.child('AnimationClip/left_foot_2/z/times').val();
					this.keyframetracks[29].values = ss.child('AnimationClip/left_foot_2/z/values').val();


					//clips,mixers,actionsを作り直す
					this.clips = [];
					this.mixers = [];
					this.actions = [];

					//clipJSONをkeyframetracksから作成
					var clipJSON_Human = {
					  duration: 4,
					  name:"human_animation",
					  tracks: [
					    this.keyframetracks[0],
					    this.keyframetracks[1],
					    this.keyframetracks[2],

					    this.keyframetracks[15],
					    this.keyframetracks[16],
					    this.keyframetracks[17]
					  ]
					};
					var clipJSON_RightArm = {
					  duration: 4,
					  name:"right_arm_animation",
					  tracks: [
					    this.keyframetracks[3],
					    this.keyframetracks[4],
					    this.keyframetracks[5],

					    this.keyframetracks[6],
					    this.keyframetracks[7],
					    this.keyframetracks[8]
					  ]
					};
					var clipJSON_LeftArm = {
					  duration: 4,
					  name:"left_arm_animation",
					  tracks: [
					    this.keyframetracks[9],
					    this.keyframetracks[10],
					    this.keyframetracks[11],

					    this.keyframetracks[12],
					    this.keyframetracks[13],
					    this.keyframetracks[14]
					  ]
					};
					var clipJSON_RightFoot = {
					  duration: 4,
					  name:"right_foot_animation",
					  tracks: [
					    this.keyframetracks[18],
					    this.keyframetracks[19],
					    this.keyframetracks[20],

					    this.keyframetracks[21],
					    this.keyframetracks[22],
					    this.keyframetracks[23]
					  ]
					};
					var clipJSON_LeftFoot = {
					  duration: 4,
					  name:"left_foot_animation",
					  tracks: [
					    this.keyframetracks[24],
					    this.keyframetracks[25],
					    this.keyframetracks[26],

					    this.keyframetracks[27],
					    this.keyframetracks[28],
					    this.keyframetracks[29]
					  ]
					};


					var clip_Human = THREE.AnimationClip.parse(clipJSON_Human);
					var clip_RightArm = THREE.AnimationClip.parse(clipJSON_RightArm);
					var clip_LeftArm = THREE.AnimationClip.parse(clipJSON_LeftArm);
					var clip_RightFoot = THREE.AnimationClip.parse(clipJSON_RightFoot);
					var clip_LeftFoot = THREE.AnimationClip.parse(clipJSON_LeftFoot);
					this.clips.push(clip_Human);
					this.clips.push(clip_RightArm);
					this.clips.push(clip_LeftArm);
					this.clips.push(clip_RightFoot);
					this.clips.push(clip_LeftFoot);

					var human_mixer = new THREE.AnimationMixer(this.human);
					var right_arm_mixer = new THREE.AnimationMixer(this.human.children[0].children[1]);
					var left_arm_mixer = new THREE.AnimationMixer(this.human.children[0].children[2]);
					var right_foot_mixer = new THREE.AnimationMixer(this.human.children[1].children[0]);
					var left_foot_mixer = new THREE.AnimationMixer(this.human.children[1].children[1]);
					this.mixers.push(human_mixer);
					this.mixers.push(right_arm_mixer);
					this.mixers.push(left_arm_mixer);
					this.mixers.push(right_foot_mixer);
					this.mixers.push(left_foot_mixer);

					var human_action = this.mixers[0].clipAction(this.clips[0]);
					var right_arm_action = this.mixers[1].clipAction(this.clips[1]);
					var left_arm_action = this.mixers[2].clipAction(this.clips[2]);
					var right_foot_action = this.mixers[3].clipAction(this.clips[3]);
					var left_foot_action = this.mixers[4].clipAction(this.clips[4]);
					this.actions.push(human_action);
					this.actions.push(right_arm_action);
					this.actions.push(left_arm_action);
					this.actions.push(right_foot_action);
					this.actions.push(left_foot_action);
					//ループ設定(１回のみ)
					this.actions[0].setLoop(THREE.LoopOnce);
					this.actions[1].setLoop(THREE.LoopOnce);
					this.actions[2].setLoop(THREE.LoopOnce);
					this.actions[3].setLoop(THREE.LoopOnce);
					this.actions[4].setLoop(THREE.LoopOnce);
					this.actions[0].play();
					this.actions[1].play();
					this.actions[2].play();
					this.actions[3].play();
					this.actions[4].play();

					//データベース変更が発生したことをユーザーに知らせるようにしたい
					alert('Databaseが更新されました');

					//フレーム数が指定されていたら...

					//部位が選択されていたら...

        },
				//Orbit操作に対して描画を更新するためのメソッド
				OrbitStart:function(e){
					e.preventDefault();
					this.canvas.addEventListener(this.eventmove,this.OrbitMove);
					this.canvas.addEventListener(this.eventend,this.OrbitEnd);
				},
				OrbitMove:function(e){
					this.controls.update();
					console.log("from OrbitMove");
					this.renderer.render(this.scene, this.camera);
				},
				OrbitEnd:function(e){
					this.canvas.removeEventListener(this.eventmove,this.OrbitMove);
					this.canvas.removeEventListener(this.eventend,this.OrbitEnd);
				},
				//アニメーションを再生する
				animate:function(e){
					//リセットが必要かどうかのチェック
					if(this.reset_flag){
						this.actions[0].reset();
						this.actions[1].reset();
						this.actions[2].reset();
						this.actions[3].reset();
						this.actions[4].reset();
						this.reset_flag = false;
					};


					console.log("再生中");
					this.scene.remove(this.human_clone);
					this.scene.add(this.human);


					this.mixers[0].update(0.01);
					this.mixers[1].update(0.01);
					this.mixers[2].update(0.01);
					this.mixers[3].update(0.01);
					this.mixers[4].update(0.01);

					this.controls.update();
					this.renderer.render(this.scene, this.camera);

					if(this.actions[0].isRunning() == false &&
							this.actions[1].isRunning() == false &&
							this.actions[2].isRunning() == false &&
							this.actions[3].isRunning() == false &&
							this.actions[4].isRunning() == false){
						const flag = true;
						try {
								if (flag) {
										//アニメーションをもう一度再生する時に備えて
										//リセットしておく
										this.actions[0].reset();
										this.actions[1].reset();
										this.actions[2].reset();
										this.actions[3].reset();
										this.actions[4].reset();

										this.scene.remove(this.human);
										this.scene.add(this.human_clone);

										throw new Error('終了します');
								};
						} catch (e) {
								console.log(e.message);
						};

					}else{
						requestAnimationFrame(this.animate);
					};

				},
				//フレーム選択時に実行する
				FrameSelect:function(e){
					var time = this.bar_value;
				  this.actions[0].time = time;
					this.actions[1].time = time;
					this.actions[2].time = time;
					this.actions[3].time = time;
					this.actions[4].time = time;

				  this.mixers[0].time = time;
					this.mixers[1].time = time;
					this.mixers[2].time = time;
					this.mixers[3].time = time;
					this.mixers[4].time = time;

				  this.mixers[0].update(0);
					this.mixers[1].update(0);
					this.mixers[2].update(0);
					this.mixers[3].update(0);
					this.mixers[4].update(0);


					//actions,mixersによって算出されたrotationを
					//human_cloneに適用する.
					this.human_clone.children[0].rotation.set(
						this.human.children[0].rotation.x,
						this.human.children[0].rotation.y,
						this.human.children[0].rotation.z
					);
					this.human_clone.children[0].children[1].rotation.set(
						this.human.children[0].children[1].rotation.x,
						this.human.children[0].children[1].rotation.y,
						this.human.children[0].children[1].rotation.z
					);
					this.human_clone.children[0].children[1].children[0].rotation.set(
						this.human.children[0].children[1].children[0].rotation.x,
						this.human.children[0].children[1].children[0].rotation.y,
						this.human.children[0].children[1].children[0].rotation.z
					);
					this.human_clone.children[0].children[2].rotation.set(
						this.human.children[0].children[2].rotation.x,
						this.human.children[0].children[2].rotation.y,
						this.human.children[0].children[2].rotation.z
					);
					this.human_clone.children[0].children[2].children[0].rotation.set(
						this.human.children[0].children[2].children[0].rotation.x,
						this.human.children[0].children[2].children[0].rotation.y,
						this.human.children[0].children[2].children[0].rotation.z
					);
					this.human_clone.children[1].rotation.set(
						this.human.children[1].rotation.x,
						this.human.children[1].rotation.y,
						this.human.children[1].rotation.z
					);
					this.human_clone.children[1].children[0].rotation.set(
						this.human.children[1].children[0].rotation.x,
						this.human.children[1].children[0].rotation.y,
						this.human.children[1].children[0].rotation.z
					);
					this.human_clone.children[1].children[0].children[0].rotation.set(
						this.human.children[1].children[0].children[0].rotation.x,
						this.human.children[1].children[0].children[0].rotation.y,
						this.human.children[1].children[0].children[0].rotation.z
					);
					this.human_clone.children[1].children[1].rotation.set(
						this.human.children[1].children[1].rotation.x,
						this.human.children[1].children[1].rotation.y,
						this.human.children[1].children[1].rotation.z
					);
					this.human_clone.children[1].children[1].children[0].rotation.set(
						this.human.children[1].children[1].children[0].rotation.x,
						this.human.children[1].children[1].children[0].rotation.y,
						this.human.children[1].children[1].children[0].rotation.z
					);


					this.controls.update();
					this.renderer.render(this.scene, this.camera);
					//console.log("from FrameSelecte");
					this.reset_flag = true;

					//部位がすでに選ばれていれば、角度バーを更新
					if(this.selected_parts != 0){
						this.rotationX_bar = this.selected_parts.rotation.x;
						this.rotationY_bar = this.selected_parts.rotation.y;
						this.rotationZ_bar = this.selected_parts.rotation.z;
						//角度バーに反映された直後の値を保持
						this.selected_parts_rotX = this.selected_parts.rotation.x;
						this.selected_parts_rotY = this.selected_parts.rotation.y;
						this.selected_parts_rotZ = this.selected_parts.rotation.z;
					}else{
						this.rotationX_bar = 0;
						this.rotationY_bar = 0;
						this.rotationZ_bar = 0;
					};

				},
				PartsSelect:function(e){
					this.selected_parts_name = document.getElementById('parts').value;

					//vの値で部位を検索し、角度変更バーの初期位置を調整
					//検索した部位は[selected_parts]に保持
					switch(this.selected_parts_name){
						case 'body':
							this.selected_parts = this.human_clone.children[0];
							break;
						case 'right_arm_1':
							this.selected_parts = this.human_clone.children[0].children[1];
							break;
						case 'right_arm_2':
							this.selected_parts = this.human_clone.children[0].children[1].children[0];
							break;
						case 'left_arm_1':
							this.selected_parts = this.human_clone.children[0].children[2];
							break;
						case 'left_arm_2':
							this.selected_parts = this.human_clone.children[0].children[2].children[0];
							break;
						case 'waist':
							this.selected_parts = this.human_clone.children[1];
							break;
						case 'right_foot_1':
							this.selected_parts =  this.human_clone.children[1].children[0];
							break;
						case 'right_foot_2':
							this.selected_parts = this.human_clone.children[1].children[0].children[0];
							break;
						case 'left_foot_1':
							this.selected_parts = this.human_clone.children[1].children[1];
							break;
						case 'left_foot_2':
							this.selected_parts = this.human_clone.children[1].children[1].children[0];
							break;
						default:
							console.log("Error!");
							this.selected_parts = 0;
							break;
					};

					if(this.selected_parts != 0){
						//選ばれた部位の形をバーに反映
						this.rotationX_bar = this.selected_parts.rotation.x;
						this.rotationY_bar = this.selected_parts.rotation.y;
						this.rotationZ_bar = this.selected_parts.rotation.z;
						//角度バーに反映された直後の値を保持
						this.selected_parts_rotX = this.selected_parts.rotation.x;
						this.selected_parts_rotY = this.selected_parts.rotation.y;
						this.selected_parts_rotZ = this.selected_parts.rotation.z;
					}else{
						this.rotationX_bar = 0;
						this.rotationY_bar = 0;
						this.rotationZ_bar = 0;
					};
				},
				//角度バーが変わった時、描画中のオブジェクトに反映
				//また、回転数を記録し更新確定時には元に戻す
				changePartsRotation:function(e){
					//selected_parts_nameの中身によって分岐を作り、
					//各々でthis.humanに干渉する
					switch(this.selected_parts_name){
						case 'body':
							this.human_clone.children[0].rotation.set(
								this.rotationX_bar,this.rotationY_bar,this.rotationZ_bar
							);
							break;
						case 'right_arm_1':
							this.human_clone.children[0].children[1].rotation.set(
								this.rotationX_bar,this.rotationY_bar,this.rotationZ_bar
							);
							break;
						case 'right_arm_2':
							this.human_clone.children[0].children[1].children[0].rotation.set(
								this.rotationX_bar,this.rotationY_bar,this.rotationZ_bar
							);
							break;
						case 'left_arm_1':
							this.human_clone.children[0].children[2].rotation.set(
								this.rotationX_bar,this.rotationY_bar,this.rotationZ_bar
							);
							break;
						case 'left_arm_2':
							this.human_clone.children[0].children[2].children[0].rotation.set(
								this.rotationX_bar,this.rotationY_bar,this.rotationZ_bar
							);
							break;
						case 'waist':
							this.human_clone.children[1].rotation.set(
								this.rotationX_bar,this.rotationY_bar,this.rotationZ_bar
							);
							break;
						case 'right_foot_1':
							this.human_clone.children[1].children[0].rotation.set(
								this.rotationX_bar,this.rotationY_bar,this.rotationZ_bar
							);
							break;
						case 'right_foot_2':
							this.human_clone.children[1].children[0].children[0].rotation.set(
								this.rotationX_bar,this.rotationY_bar,this.rotationZ_bar
							);
							break;
						case 'left_foot_1':
							this.human_clone.children[1].children[1].rotation.set(
								this.rotationX_bar,this.rotationY_bar,this.rotationZ_bar
							);
							break;
						case 'left_foot_2':
							this.human_clone.children[1].children[1].children[0].rotation.set(
								this.rotationX_bar,this.rotationY_bar,this.rotationZ_bar
							);
							break;
						default:
							console.log("Parts isn't selected!");
							break;
					};

					this.controls.update();
					this.renderer.render(this.scene, this.camera);
				},
				//更新ボタンが押された時、更新内容を作成しDBに反映
				makeUpdates:function(e){
					console.log("makeUpdates");

					//swicthを用いて、keyframetracksの中から指定部位のキーフレームトラック
					//の3軸のインデックスナンバーを持ってくる
					switch(this.selected_parts_name){
						case 'body':
							var keyframetrack_indexX = 0;
							var keyframetrack_indexY = 1;
							var keyframetrack_indexZ = 2;
							break;
						case 'right_arm_1':
							var keyframetrack_indexX = 3;
							var keyframetrack_indexY = 4;
							var keyframetrack_indexZ = 5;
							break;
						case 'right_arm_2':
							var keyframetrack_indexX = 6;
							var keyframetrack_indexY = 7;
							var keyframetrack_indexZ = 8;
							break;
						case 'left_arm_1':
							var keyframetrack_indexX = 9;
							var keyframetrack_indexY = 10;
							var keyframetrack_indexZ = 11;
							break;
						case 'left_arm_2':
							var keyframetrack_indexX = 12;
							var keyframetrack_indexY = 13;
							var keyframetrack_indexZ = 14;
							break;
						case 'waist':
							var keyframetrack_indexX = 15;
							var keyframetrack_indexY = 16;
							var keyframetrack_indexZ = 17;
							break;
						case 'right_foot_1':
							var keyframetrack_indexX = 18;
							var keyframetrack_indexY = 19;
							var keyframetrack_indexZ = 20;
							break;
						case 'right_foot_2':
							var keyframetrack_indexX = 21;
							var keyframetrack_indexY = 22;
							var keyframetrack_indexZ = 23;
							break;
						case 'left_foot_1':
							var keyframetrack_indexX = 24;
							var keyframetrack_indexY = 25;
							var keyframetrack_indexZ = 26;
							break;
						case 'left_foot_2':
							var keyframetrack_indexX = 27;
							var keyframetrack_indexY = 28;
							var keyframetrack_indexZ = 29;
							break;
						default:
							console.log("Error makeUpdates");
							break;
					};

					//x軸の変更をDBに反映するupdates作成
					if(this.rotationX_bar != this.selected_parts_rotX){
						for(var i=0; i<this.keyframetracks[keyframetrack_indexX].times.length; i++){
							if(this.bar_value == this.keyframetracks[keyframetrack_indexX].times[i]){
								//index番号が変数iと等しいvaluesをrotationX_barの値で更新
								this.keyframetracks[keyframetrack_indexX].values[i] = this.rotationX_bar;
								updates[this.selected_parts_name+"/x/values"] = this.keyframetracks[keyframetrack_indexX].values;
								break;
							}else if(this.bar_value < this.keyframetracks[keyframetrack_indexX].times[i]){
								//index番号が変数iの位置のtimes,valuesそれぞれにbar_value,rotationX_barの値を追加
								//それ以後のindex番号を一つずつずらす
								this.keyframetracks[keyframetrack_indexX].times.splice(i,0,this.bar_value);
								this.keyframetracks[keyframetrack_indexX].values.splice(i,0,this.rotationX_bar);
								updates[this.selected_parts_name+"/x/times"] = this.keyframetracks[keyframetrack_indexX].times;
								updates[this.selected_parts_name+"/x/values"] = this.keyframetracks[keyframetrack_indexX].values;
								break;
							}else if(i == this.keyframetracks[keyframetrack_indexX].times.length - 1){
								//最後尾にtimes,valuesそれぞれbar_value,rotationX_barの値を末尾に追加
								this.keyframetracks[keyframetrack_indexX].times.push(this.bar_value);
								this.keyframetracks[keyframetrack_indexX].values.push(this.rotationX_bar);
								updates[this.selected_parts_name+"/x/times"] = this.keyframetracks[keyframetrack_indexX].times;
								updates[this.selected_parts_name+"/x/values"] = this.keyframetracks[keyframetrack_indexX].values;
								break;
							};
						};
					};

					//y軸の変更をDBに反映するupdates作成
					if(this.rotationY_bar != this.selected_parts_rotY){
						for(var i=0; i<this.keyframetracks[keyframetrack_indexY].times.length; i++){
							if(this.bar_value == this.keyframetracks[keyframetrack_indexY].times[i]){
								//index番号が変数iと等しいvaluesをrotationY_barの値で更新
								this.keyframetracks[keyframetrack_indexY].values[i] = this.rotationY_bar;
								updates[this.selected_parts_name+"/y/values"] = this.keyframetracks[keyframetrack_indexY].values;
								break;
							}else if(this.bar_value < this.keyframetracks[keyframetrack_indexY].times[i]){
								this.keyframetracks[keyframetrack_indexY].times.splice(i,0,this.bar_value);
								this.keyframetracks[keyframetrack_indexY].values.splice(i,0,this.rotationY_bar);
								updates[this.selected_parts_name+"/y/times"] = this.keyframetracks[keyframetrack_indexY].times;
								updates[this.selected_parts_name+"/y/values"] = this.keyframetracks[keyframetrack_indexY].values;
								break;
							}else if(i == this.keyframetracks[keyframetrack_indexY].times.length - 1){
								this.keyframetracks[keyframetrack_indexY].times.push(this.bar_value);
								this.keyframetracks[keyframetrack_indexY].values.push(this.rotationY_bar);
								updates[this.selected_parts_name+"/y/times"] = this.keyframetracks[keyframetrack_indexY].times;
								updates[this.selected_parts_name+"/y/values"] = this.keyframetracks[keyframetrack_indexY].values;
								break;
							};
						};
					};

					//z軸の変更をDBに反映するupdates作成
					if(this.rotationZ_bar != this.selected_parts_rotZ){
						for(var i=0; i<this.keyframetracks[keyframetrack_indexZ].times.length; i++){
							if(this.bar_value == this.keyframetracks[keyframetrack_indexZ].times[i]){
								//index番号が変数iと等しいvaluesをrotationZ_barの値で更新
								this.keyframetracks[keyframetrack_indexZ].values[i] = this.rotationZ_bar;
								updates[this.selected_parts_name+"/z/values"] = this.keyframetracks[keyframetrack_indexZ].values;
								break;
							}else if(this.bar_value < this.keyframetracks[keyframetrack_indexZ].times[i]){
								this.keyframetracks[keyframetrack_indexZ].times.splice(i,0,this.bar_value);
								this.keyframetracks[keyframetrack_indexZ].values.splice(i,0,this.rotationZ_bar);
								updates[this.selected_parts_name+"/z/times"] = this.keyframetracks[keyframetrack_indexZ].times;
								updates[this.selected_parts_name+"/z/values"] = this.keyframetracks[keyframetrack_indexZ].values;
								break;
							}else if(i == this.keyframetracks[keyframetrack_indexZ].times.length - 1){
								this.keyframetracks[keyframetrack_indexZ].times.push(this.bar_value);
								this.keyframetracks[keyframetrack_indexZ].values.push(this.rotationZ_bar);
								updates[this.selected_parts_name+"/z/times"] = this.keyframetracks[keyframetrack_indexZ].times;
								updates[this.selected_parts_name+"/z/values"] = this.keyframetracks[keyframetrack_indexZ].values;
								break;
							};
						};
					};

					console.log(updates);
					console.log("アニメーションを上記の内容で変更");
					this.reset_flag = true;

					//selected_parts_rotX等の修正

					//お試し
					this.controls.update();
					this.renderer.render(this.scene, this.camera);

					renewDB(updates);
				}

      },
      mounted(){
        this.canvas = document.getElementById('canvas');
        this.canvas.appendChild(this.renderer.domElement);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera.position.set(0, 400, 1000);
        this.camera.lookAt(new THREE.Vector3(0,0,0));
				//Orbitカメラの設定
        this.controls = new THREE.OrbitControls(this.camera, this.canvas);
				this.controls.target.set(0, 250, 0);
				this.controls.enableZoom = false;
				this.controls.enabled = false;


        //地面を作成
        const plane2 = new THREE.GridHelper(600);
        this.scene.add(plane2);
        const plane = new THREE.AxesHelper(300);
        this.scene.add(plane);

        //体
        const body_material = new THREE.MeshNormalMaterial();
        const body_geometry = new THREE.BoxGeometry(50,150,50);
        const body = new THREE.Mesh(body_geometry,body_material);
        body.position.set(0,250,0);
        this.human.add(body);

        //頭
        const head_geometry = new THREE.SphereGeometry(30,30,30);
        const head = new THREE.Mesh(head_geometry,body_material);
        head.position.set(0,110,0);
        body.add(head)

        //腕
        const arm_material =  new THREE.LineBasicMaterial({
          color:'white'
        });
        const right_arm_points = [];
        right_arm_points.push(new THREE.Vector3(0,0,0));
        right_arm_points.push(new THREE.Vector3(-50,0,0));
        const right_arm_geometry = new THREE.BufferGeometry().setFromPoints( right_arm_points );
        const right_arm_1 = new THREE.Line( right_arm_geometry, arm_material );
        const right_arm_2 = right_arm_1.clone();
        right_arm_2.position.set(-50,0,0);
        right_arm_1.add(right_arm_2);
        right_arm_1.position.set(-25,75,0);
        body.add(right_arm_1);

        const left_arm_points = [];
        left_arm_points.push(new THREE.Vector3(0,0,0));
        left_arm_points.push(new THREE.Vector3(50,0,0));
        const left_arm_geometry = new THREE.BufferGeometry().setFromPoints( left_arm_points );
        const left_arm_1 = new THREE.Line( left_arm_geometry, arm_material );
        const left_arm_2 = left_arm_1.clone();
        left_arm_2.position.set(50,0,0);
        left_arm_1.add(left_arm_2);
        left_arm_1.position.set(25,75,0);
        body.add(left_arm_1);

        //腰
        const waist_geometry = new THREE.BoxGeometry(50,20,50);
        const waist = new THREE.Mesh(waist_geometry, body_material);
        this.human.add(waist);
        waist.position.set(0,160,0);

        //足
        const foot_material =  new THREE.LineBasicMaterial({
          color:'white'
        });
        const right_foot_points = [];
        right_foot_points.push(new THREE.Vector3(0,0,0));
        right_foot_points.push(new THREE.Vector3(0,-80,0));
        const right_foot_geometry = new THREE.BufferGeometry().setFromPoints( right_foot_points );
        const right_foot_1 = new THREE.Line( right_foot_geometry, foot_material );
        const right_foot_2 = right_foot_1.clone();
        right_foot_2.position.set(0,-80,0);
        right_foot_1.add(right_foot_2);
        right_foot_1.position.set(-25,0,0);
        waist.add(right_foot_1);

        const left_foot_points = [];
        left_foot_points.push(new THREE.Vector3(0,0,0));
        left_foot_points.push(new THREE.Vector3(0,-80,0));
        const left_foot_geometry = new THREE.BufferGeometry().setFromPoints( left_foot_points );
        const left_foot_1 = new THREE.Line( left_foot_geometry, foot_material );
        const left_foot_2 = left_foot_1.clone();
        left_foot_2.position.set(0,-80,0);
        left_foot_1.add(left_foot_2);
        left_foot_1.position.set(25,0,0);
        waist.add(left_foot_1);

				this.human_clone = this.human.clone();
				//humanは再生時のみaddする
				this.scene.add(this.human_clone);
				//this.scene.add(this.human);

        //これより以下でfssからアニメーションクリップを作成
				//各部位毎-各軸毎にKeyframeTrackJSONを作成
				var rotationKeyframeTrackJSON_Body_x = {
					name:".children[0].rotation[x]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_Body_y = {
					name:".children[0].rotation[y]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_Body_z = {
					name:".children[0].rotation[z]",
					type:"number",
					times:[0],
					values:[0]
				};

				var rotationKeyframeTrackJSON_RightArm1_x = {
					name:".rotation[x]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_RightArm1_y = {
					name:".rotation[y]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_RightArm1_z = {
					name:".rotation[z]",
					type:"number",
					times:[0],
					values:[0]
				};

				var rotationKeyframeTrackJSON_RightArm2_x = {
					name:".children[0].rotation[x]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_RightArm2_y = {
					name:".children[0].rotation[y]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_RightArm2_z = {
					name:".children[0].rotation[z]",
					type:"number",
					times:[0],
					values:[0]
				};

				var rotationKeyframeTrackJSON_LeftArm1_x = {
					name:".rotation[x]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_LeftArm1_y = {
					name:".rotation[y]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_LeftArm1_z = {
					name:".rotation[z]",
					type:"number",
					times:[0],
					values:[0]
				};

				var rotationKeyframeTrackJSON_LeftArm2_x = {
					name:".children[0].rotation[x]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_LeftArm2_y = {
					name:".children[0].rotation[y]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_LeftArm2_z = {
					name:".children[0].rotation[z]",
					type:"number",
					times:[0],
					values:[0]
				};

				var rotationKeyframeTrackJSON_Waist_x = {
					name:".children[1].rotation[x]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_Waist_y = {
					name:".children[1].rotation[y]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_Waist_z = {
					name:".children[1].rotation[z]",
					type:"number",
					times:[0],
					values:[0]
				};

				var rotationKeyframeTrackJSON_RightFoot1_x = {
					name:".rotation[x]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_RightFoot1_y = {
					name:".rotation[y]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_RightFoot1_z = {
					name:".rotation[z]",
					type:"number",
					times:[0],
					values:[0]
				};

				var rotationKeyframeTrackJSON_RightFoot2_x = {
					name:".children[0].rotation[x]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_RightFoot2_y = {
					name:".children[0].rotation[y]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_RightFoot2_z = {
					name:".children[0].rotation[z]",
					type:"number",
					times:[0],
					values:[0]
				};

				var rotationKeyframeTrackJSON_LeftFoot1_x = {
					name:".rotation[x]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_LeftFoot1_y = {
					name:".rotation[y]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_LeftFoot1_z = {
					name:".rotation[z]",
					type:"number",
					times:[0],
					values:[0]
				};

				var rotationKeyframeTrackJSON_LeftFoot2_x = {
					name:".children[0].rotation[x]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_LeftFoot2_y = {
					name:".children[0].rotation[y]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_LeftFoot2_z = {
					name:".children[0].rotation[z]",
					type:"number",
					times:[0],
					values:[0]
				};

				this.keyframetracks.push(rotationKeyframeTrackJSON_Body_x);
				this.keyframetracks.push(rotationKeyframeTrackJSON_Body_y);
				this.keyframetracks.push(rotationKeyframeTrackJSON_Body_z);
				this.keyframetracks.push(rotationKeyframeTrackJSON_RightArm1_x);
				this.keyframetracks.push(rotationKeyframeTrackJSON_RightArm1_y);
				this.keyframetracks.push(rotationKeyframeTrackJSON_RightArm1_z);
				this.keyframetracks.push(rotationKeyframeTrackJSON_RightArm2_x);
				this.keyframetracks.push(rotationKeyframeTrackJSON_RightArm2_y);
				this.keyframetracks.push(rotationKeyframeTrackJSON_RightArm2_z);
				this.keyframetracks.push(rotationKeyframeTrackJSON_LeftArm1_x);
				this.keyframetracks.push(rotationKeyframeTrackJSON_LeftArm1_y);
				this.keyframetracks.push(rotationKeyframeTrackJSON_LeftArm1_z);
				this.keyframetracks.push(rotationKeyframeTrackJSON_LeftArm2_x);
				this.keyframetracks.push(rotationKeyframeTrackJSON_LeftArm2_y);
				this.keyframetracks.push(rotationKeyframeTrackJSON_LeftArm2_z);
				this.keyframetracks.push(rotationKeyframeTrackJSON_Waist_x);
				this.keyframetracks.push(rotationKeyframeTrackJSON_Waist_y);
				this.keyframetracks.push(rotationKeyframeTrackJSON_Waist_z);
				this.keyframetracks.push(rotationKeyframeTrackJSON_RightFoot1_x);
				this.keyframetracks.push(rotationKeyframeTrackJSON_RightFoot1_y);
				this.keyframetracks.push(rotationKeyframeTrackJSON_RightFoot1_z);
				this.keyframetracks.push(rotationKeyframeTrackJSON_RightFoot2_x);
				this.keyframetracks.push(rotationKeyframeTrackJSON_RightFoot2_y);
				this.keyframetracks.push(rotationKeyframeTrackJSON_RightFoot2_z);
				this.keyframetracks.push(rotationKeyframeTrackJSON_LeftFoot1_x);
				this.keyframetracks.push(rotationKeyframeTrackJSON_LeftFoot1_y);
				this.keyframetracks.push(rotationKeyframeTrackJSON_LeftFoot1_z);
				this.keyframetracks.push(rotationKeyframeTrackJSON_LeftFoot2_x);
				this.keyframetracks.push(rotationKeyframeTrackJSON_LeftFoot2_y);
				this.keyframetracks.push(rotationKeyframeTrackJSON_LeftFoot2_z);
				//keyframetracksは30個


				//スナップショットからデータを取得
				this.keyframetracks[0].times = fss.child('AnimationClip/body/x/times').val();
				this.keyframetracks[0].values = fss.child('AnimationClip/body/x/values').val();
				this.keyframetracks[1].times = fss.child('AnimationClip/body/y/times').val();
				this.keyframetracks[1].values = fss.child('AnimationClip/body/y/values').val();
				this.keyframetracks[2].times = fss.child('AnimationClip/body/z/times').val();
				this.keyframetracks[2].values = fss.child('AnimationClip/body/z/values').val();

				this.keyframetracks[3].times = fss.child('AnimationClip/right_arm_1/x/times').val();
				this.keyframetracks[3].values = fss.child('AnimationClip/right_arm_1/x/values').val();
				this.keyframetracks[4].times = fss.child('AnimationClip/right_arm_1/y/times').val();
				this.keyframetracks[4].values = fss.child('AnimationClip/right_arm_1/y/values').val();
				this.keyframetracks[5].times = fss.child('AnimationClip/right_arm_1/z/times').val();
				this.keyframetracks[5].values = fss.child('AnimationClip/right_arm_1/z/values').val();

				this.keyframetracks[6].times = fss.child('AnimationClip/right_arm_2/x/times').val();
				this.keyframetracks[6].values = fss.child('AnimationClip/right_arm_2/x/values').val();
				this.keyframetracks[7].times = fss.child('AnimationClip/right_arm_2/y/times').val();
				this.keyframetracks[7].values = fss.child('AnimationClip/right_arm_2/y/values').val();
				this.keyframetracks[8].times = fss.child('AnimationClip/right_arm_2/z/times').val();
				this.keyframetracks[8].values = fss.child('AnimationClip/right_arm_2/z/values').val();

				this.keyframetracks[9].times = fss.child('AnimationClip/left_arm_1/x/times').val();
				this.keyframetracks[9].values = fss.child('AnimationClip/left_arm_1/x/values').val();
				this.keyframetracks[10].times = fss.child('AnimationClip/left_arm_1/y/times').val();
				this.keyframetracks[10].values = fss.child('AnimationClip/left_arm_1/y/values').val();
				this.keyframetracks[11].times = fss.child('AnimationClip/left_arm_1/z/times').val();
				this.keyframetracks[11].values = fss.child('AnimationClip/left_arm_1/z/values').val();

				this.keyframetracks[12].times = fss.child('AnimationClip/left_arm_2/x/times').val();
				this.keyframetracks[12].values = fss.child('AnimationClip/left_arm_2/x/values').val();
				this.keyframetracks[13].times = fss.child('AnimationClip/left_arm_2/y/times').val();
				this.keyframetracks[13].values = fss.child('AnimationClip/left_arm_2/y/values').val();
				this.keyframetracks[14].times = fss.child('AnimationClip/left_arm_2/z/times').val();
				this.keyframetracks[14].values = fss.child('AnimationClip/left_arm_2/z/values').val();

				this.keyframetracks[15].times = fss.child('AnimationClip/waist/x/times').val();
				this.keyframetracks[15].values = fss.child('AnimationClip/waist/x/values').val();
				this.keyframetracks[16].times = fss.child('AnimationClip/waist/y/times').val();
				this.keyframetracks[16].values = fss.child('AnimationClip/waist/y/values').val();
				this.keyframetracks[17].times = fss.child('AnimationClip/waist/z/times').val();
				this.keyframetracks[17].values = fss.child('AnimationClip/waist/z/values').val();

				this.keyframetracks[18].times = fss.child('AnimationClip/right_foot_1/x/times').val();
				this.keyframetracks[18].values = fss.child('AnimationClip/right_foot_1/x/values').val();
				this.keyframetracks[19].times = fss.child('AnimationClip/right_foot_1/y/times').val();
				this.keyframetracks[19].values = fss.child('AnimationClip/right_foot_1/y/values').val();
				this.keyframetracks[20].times = fss.child('AnimationClip/right_foot_1/z/times').val();
				this.keyframetracks[20].values = fss.child('AnimationClip/right_foot_1/z/values').val();

				this.keyframetracks[21].times = fss.child('AnimationClip/right_foot_2/x/times').val();
				this.keyframetracks[21].values = fss.child('AnimationClip/right_foot_2/x/values').val();
				this.keyframetracks[22].times = fss.child('AnimationClip/right_foot_2/y/times').val();
				this.keyframetracks[22].values = fss.child('AnimationClip/right_foot_2/y/values').val();
				this.keyframetracks[23].times = fss.child('AnimationClip/right_foot_2/z/times').val();
				this.keyframetracks[23].values = fss.child('AnimationClip/right_foot_2/z/values').val();

				this.keyframetracks[24].times = fss.child('AnimationClip/left_foot_1/x/times').val();
				this.keyframetracks[24].values = fss.child('AnimationClip/left_foot_1/x/values').val();
				this.keyframetracks[25].times = fss.child('AnimationClip/left_foot_1/y/times').val();
				this.keyframetracks[25].values = fss.child('AnimationClip/left_foot_1/y/values').val();
				this.keyframetracks[26].times = fss.child('AnimationClip/left_foot_1/z/times').val();
				this.keyframetracks[26].values = fss.child('AnimationClip/left_foot_1/z/values').val();

				this.keyframetracks[27].times = fss.child('AnimationClip/left_foot_2/x/times').val();
				this.keyframetracks[27].values = fss.child('AnimationClip/left_foot_2/x/values').val();
				this.keyframetracks[28].times = fss.child('AnimationClip/left_foot_2/y/times').val();
				this.keyframetracks[28].values = fss.child('AnimationClip/left_foot_2/y/values').val();
				this.keyframetracks[29].times = fss.child('AnimationClip/left_foot_2/z/times').val();
				this.keyframetracks[29].values = fss.child('AnimationClip/left_foot_2/z/values').val();


				//clipJSONをkeyframetracksから作成
				var clipJSON_Human = {
					duration: 4,
					name:"human_animation",
					tracks: [
						this.keyframetracks[0],
						this.keyframetracks[1],
						this.keyframetracks[2],

						this.keyframetracks[15],
						this.keyframetracks[16],
						this.keyframetracks[17]
					]
				};
				var clipJSON_RightArm = {
					duration: 4,
					name:"right_arm_animation",
					tracks: [
						this.keyframetracks[3],
						this.keyframetracks[4],
						this.keyframetracks[5],

						this.keyframetracks[6],
						this.keyframetracks[7],
						this.keyframetracks[8]
					]
				};
				var clipJSON_LeftArm = {
					duration: 4,
					name:"left_arm_animation",
					tracks: [
						this.keyframetracks[9],
						this.keyframetracks[10],
						this.keyframetracks[11],

						this.keyframetracks[12],
						this.keyframetracks[13],
						this.keyframetracks[14]
					]
				};
				var clipJSON_RightFoot = {
					duration: 4,
					name:"right_foot_animation",
					tracks: [
						this.keyframetracks[18],
						this.keyframetracks[19],
						this.keyframetracks[20],

						this.keyframetracks[21],
						this.keyframetracks[22],
						this.keyframetracks[23]
					]
				};
				var clipJSON_LeftFoot = {
					duration: 4,
					name:"left_foot_animation",
					tracks: [
						this.keyframetracks[24],
						this.keyframetracks[25],
						this.keyframetracks[26],

						this.keyframetracks[27],
						this.keyframetracks[28],
						this.keyframetracks[29]
					]
				};


				var clip_Human = THREE.AnimationClip.parse(clipJSON_Human);
				var clip_RightArm = THREE.AnimationClip.parse(clipJSON_RightArm);
				var clip_LeftArm = THREE.AnimationClip.parse(clipJSON_LeftArm);
				var clip_RightFoot = THREE.AnimationClip.parse(clipJSON_RightFoot);
				var clip_LeftFoot = THREE.AnimationClip.parse(clipJSON_LeftFoot);
				this.clips.push(clip_Human);
				this.clips.push(clip_RightArm);
				this.clips.push(clip_LeftArm);
				this.clips.push(clip_RightFoot);
				this.clips.push(clip_LeftFoot);

				var human_mixer = new THREE.AnimationMixer(this.human);
		    var right_arm_mixer = new THREE.AnimationMixer(this.human.children[0].children[1]);
		    var left_arm_mixer = new THREE.AnimationMixer(this.human.children[0].children[2]);
		    var right_foot_mixer = new THREE.AnimationMixer(this.human.children[1].children[0]);
		    var left_foot_mixer = new THREE.AnimationMixer(this.human.children[1].children[1]);
				this.mixers.push(human_mixer);
				this.mixers.push(right_arm_mixer);
				this.mixers.push(left_arm_mixer);
				this.mixers.push(right_foot_mixer);
				this.mixers.push(left_foot_mixer);


		    var human_action = this.mixers[0].clipAction(this.clips[0]);
		    var right_arm_action = this.mixers[1].clipAction(this.clips[1]);
				var left_arm_action = this.mixers[2].clipAction(this.clips[2]);
				var right_foot_action = this.mixers[3].clipAction(this.clips[3]);
				var left_foot_action = this.mixers[4].clipAction(this.clips[4]);
				this.actions.push(human_action);
				this.actions.push(right_arm_action);
				this.actions.push(left_arm_action);
				this.actions.push(right_foot_action);
				this.actions.push(left_foot_action);
				//ループ設定(１回のみ)
				this.actions[0].setLoop(THREE.LoopOnce);
				this.actions[1].setLoop(THREE.LoopOnce);
				this.actions[2].setLoop(THREE.LoopOnce);
				this.actions[3].setLoop(THREE.LoopOnce);
				this.actions[4].setLoop(THREE.LoopOnce);
				this.actions[0].play();
				this.actions[1].play();
				this.actions[2].play();
				this.actions[3].play();
				this.actions[4].play();

				this.controls.update();
        this.renderer.render(this.scene, this.camera);

				this.controls.enabled = true;
				this.canvas.addEventListener(this.eventstart,
					this.OrbitStart,{passive:false});

				spinner.classList.add('loaded');
      }
    });
  };

  function waitRTDBload(){
    database.ref('/student').on('value',function(snapshot){
      if(!first){
        vm.changed_DB_bySomeone(snapshot);
      }else{
        createV(snapshot);
        first = false;
      }
    });
  };

  waitRTDBload();
}

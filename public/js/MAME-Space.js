window.onload = function(){
	//ローディング画面のDOM要素を所得
	const spinner = document.getElementById('loading');

  //タッチイベントが利用可能かどうかの判別
	var supportTouch = 'ontouchend' in document;

	//イベント名の決定
	const EVENTNAME_START = supportTouch? 'touchstart':'mousedown';
	const EVENTNAME_MOVE = supportTouch? 'touchmove':'mousemove';
	const EVENTNAME_END = supportTouch? 'touchend':'mouseup';


	var onMouseDownMouseX = 0, onMouseDownMouseY = 0,
	lon = 0, onMouseDownLon = 0,
	lat = 0, onMouseDownLat = 0;
	//非同期処理のためのフラッグ
	//選択中のPivotを保持する変数
	let selected_Pivot = 0;
	//Meshが選択中かどうか判別するフラグ
	let flag_sel = 0;
	//選択されたメッシュのピボットが保持されたかを判別するフラグ
	let flag_hol = 0;
	//回転の許可を示すフラグ
	let flag_rot = 0;

	//Promiseコンストラクター
	//flagを受け取って、正ならば次の処理に渡す
	function asyncProcess(value){
		return new Promise((resolve,reject) => {
			setTimeout(() => {
				if(value == 1){
					resolve('選択されています');
				}else{
					reject('選択されていません');
				}
			},100);                       //flag が1になるのを待つための時間
		});
	}

	//次のステップへ進めるための、仮のプロセス
	function asyncProcess_q(value){
		return new Promise((resolve,reject) => {
			setTimeout(() => {
				if(value){
					resolve();
				}else{
					reject('error発生');
				}
			},0)
		})
	}


  // Get a reference to the database service
  var database = firebase.database();

	//Vueインスタンスが存在するかどうかを判別するフラグ
	var first = true;

	//更新内容を一時保存する変数
	var updates = {};

	//起動ブラウザのtimeOriginを表示
	console.log("timeOrgin: "+performance.timeOrigin);
	//処理時間計測用・更新ボタン押した時
	var startTime = 0;


	function renewDB(update_set){
		//update_setは、行われたDOM操作に関して記録したリストとする
		if(update_set != {}){
			console.log("DB update");
			const DBupdStart = performance.now();
			database.ref("/student/AnimationClip").update(update_set);
			const DBupdEnd = performance.now();
			console.log("更新時間: "+ (DBupdEnd - DBupdStart));
			//updatesを初期化
			updates = {};
		}else{
			console.log("updates is Empty");
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
				//メッシュリストを保持(レイキャスターに使用)
				MeshList:							[],
				//ピボットリストを保持
				PivotList:						[],
				//オブジェクト別名前リスト
				obj_name_list:				[],
				//ピボットリストを子要素として保持（キーフレームアニメーションに使用）
				AnimationList:				new THREE.Group(),
				//マウス座標管理用のベクトルを生成
				mouse:								new THREE.Vector2(),
				//レイキャスターを作成
				raycaster:						new THREE.Raycaster(),
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
				//カメラ操作と編集を切り替えるボタン
				button_mes:						"現在:物体操作",
        eventstart:   				EVENTNAME_START,
        eventmove:    				EVENTNAME_MOVE,
        eventend:     				EVENTNAME_END
      },
      methods:{
				//データが変更された時実行する
        changed_DB_bySomeone:function(ss){
					console.log("change DB");

					//human_cloneに対するアニメーションを停止
					this.actions[0].stop();
					//this.actions[1].stop();
					//this.actions[2].stop();
					//this.actions[3].stop();
					//this.actions[4].stop();

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
					    this.keyframetracks[17],
					//  ]
					//};
					//var clipJSON_RightArm = {
					//  duration: 4,
					//  name:"right_arm_animation",
					//  tracks: [
					    this.keyframetracks[3],
					    this.keyframetracks[4],
					    this.keyframetracks[5],

					    this.keyframetracks[6],
					    this.keyframetracks[7],
					    this.keyframetracks[8],
					//  ]
					//};
					//var clipJSON_LeftArm = {
					//  duration: 4,
					//  name:"left_arm_animation",
					//  tracks: [
					    this.keyframetracks[9],
					    this.keyframetracks[10],
					    this.keyframetracks[11],

					    this.keyframetracks[12],
					    this.keyframetracks[13],
					    this.keyframetracks[14],
					//  ]
					//};
					//var clipJSON_RightFoot = {
					//  duration: 4,
					//  name:"right_foot_animation",
					//  tracks: [
					    this.keyframetracks[18],
					    this.keyframetracks[19],
					    this.keyframetracks[20],

					    this.keyframetracks[21],
					    this.keyframetracks[22],
					    this.keyframetracks[23],
					//  ]
					//};
					//var clipJSON_LeftFoot = {
					//  duration: 4,
					//  name:"left_foot_animation",
					//  tracks: [
					    this.keyframetracks[24],
					    this.keyframetracks[25],
					    this.keyframetracks[26],

					    this.keyframetracks[27],
					    this.keyframetracks[28],
					    this.keyframetracks[29]
					  ]
					};


					var clip_all = THREE.AnimationClip.parse(clipJSON_Human);
					//var clip_Human = THREE.AnimationClip.parse(clipJSON_Human);
					//var clip_RightArm = THREE.AnimationClip.parse(clipJSON_RightArm);
					//var clip_LeftArm = THREE.AnimationClip.parse(clipJSON_LeftArm);
					//var clip_RightFoot = THREE.AnimationClip.parse(clipJSON_RightFoot);
					//var clip_LeftFoot = THREE.AnimationClip.parse(clipJSON_LeftFoot);
					this.clips.push(clip_all);
					//this.clips.push(clip_Human);
					//this.clips.push(clip_RightArm);
					//this.clips.push(clip_LeftArm);
					//this.clips.push(clip_RightFoot);
					//this.clips.push(clip_LeftFoot);

					var all_mixer = new THREE.AnimationMixer(this.human_clone);
					//var human_mixer = new THREE.AnimationMixer(this.human);
					//var right_arm_mixer = new THREE.AnimationMixer(this.human.children[0].children[1]);
					//var left_arm_mixer = new THREE.AnimationMixer(this.human.children[0].children[2]);
					//var right_foot_mixer = new THREE.AnimationMixer(this.human.children[1].children[0]);
					//var left_foot_mixer = new THREE.AnimationMixer(this.human.children[1].children[1]);
					this.mixers.push(all_mixer);
					//this.mixers.push(human_mixer);
					//this.mixers.push(right_arm_mixer);
					//this.mixers.push(left_arm_mixer);
					//this.mixers.push(right_foot_mixer);
					//this.mixers.push(left_foot_mixer);

					var all_action = this.mixers[0].clipAction(this.clips[0]);
					//var human_action = this.mixers[0].clipAction(this.clips[0]);
					//var right_arm_action = this.mixers[1].clipAction(this.clips[1]);
					//var left_arm_action = this.mixers[2].clipAction(this.clips[2]);
					//var right_foot_action = this.mixers[3].clipAction(this.clips[3]);
					//var left_foot_action = this.mixers[4].clipAction(this.clips[4]);
					this.actions.push(all_action);
					//this.actions.push(human_action);
					//this.actions.push(right_arm_action);
					//this.actions.push(left_arm_action);
					//this.actions.push(right_foot_action);
					//this.actions.push(left_foot_action);

					//ループ設定(１回のみ)
					this.actions[0].setLoop(THREE.LoopOnce);
					//this.actions[1].setLoop(THREE.LoopOnce);
					//this.actions[2].setLoop(THREE.LoopOnce);
					//this.actions[3].setLoop(THREE.LoopOnce);
					//this.actions[4].setLoop(THREE.LoopOnce);
					this.actions[0].play();
					//this.actions[1].play();
					//this.actions[2].play();
					//this.actions[3].play();
					//this.actions[4].play();

					//console.log("Hello by change")

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
					//	this.actions[1].reset();
					//	this.actions[2].reset();
					//	this.actions[3].reset();
					//	this.actions[4].reset();
						this.reset_flag = false;
					};


					console.log("再生中");
					this.scene.remove(this.human);
					this.scene.add(this.human_clone);


					this.mixers[0].update(0.01);
					//this.mixers[1].update(0.01);
					//this.mixers[2].update(0.01);
					//this.mixers[3].update(0.01);
					//this.mixers[4].update(0.01);

					this.controls.update();
					this.renderer.render(this.scene, this.camera);

					if(this.actions[0].isRunning() == false
					 		//&&
							//this.actions[1].isRunning() == false &&
							//this.actions[2].isRunning() == false &&
							//this.actions[3].isRunning() == false &&
							//this.actions[4].isRunning() == false
						){
						const flag = true;
						try {
								if (flag) {
										//アニメーションをもう一度再生する時に備えて
										//リセットしておく
										this.actions[0].reset();
										//this.actions[1].reset();
										//this.actions[2].reset();
										//this.actions[3].reset();
										//this.actions[4].reset();

										this.scene.remove(this.human_clone);
										this.scene.add(this.human);

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
					//this.actions[1].time = time;
					//this.actions[2].time = time;
					//this.actions[3].time = time;
					//this.actions[4].time = time;

				  this.mixers[0].time = time;
					//this.mixers[1].time = time;
					//this.mixers[2].time = time;
					//this.mixers[3].time = time;
					//this.mixers[4].time = time;

				  this.mixers[0].update(0);
					//this.mixers[1].update(0);
					//this.mixers[2].update(0);
					//this.mixers[3].update(0);
					//this.mixers[4].update(0);


					//actions,mixersによって算出されたrotationを
					//編集用のhumanに適用する.
					//体の回転
					this.human.children[0].rotation.set(
						this.human_clone.children[0].rotation.x,
						this.human_clone.children[0].rotation.y,
						this.human_clone.children[0].rotation.z
					);
					//右上腕の回転
					this.human.children[0].children[2].rotation.set(
						this.human_clone.children[0].children[2].rotation.x,
						this.human_clone.children[0].children[2].rotation.y,
						this.human_clone.children[0].children[2].rotation.z
					);
					//右前腕の回転
					this.human.children[0].children[2].children[0].rotation.set(
						this.human_clone.children[0].children[2].children[0].rotation.x,
						this.human_clone.children[0].children[2].children[0].rotation.y,
						this.human_clone.children[0].children[2].children[0].rotation.z
					);
					//左上腕の回転
					this.human.children[0].children[3].rotation.set(
						this.human_clone.children[0].children[3].rotation.x,
						this.human_clone.children[0].children[3].rotation.y,
						this.human_clone.children[0].children[3].rotation.z
					);
					//左前腕の回転
					this.human.children[0].children[3].children[0].rotation.set(
						this.human_clone.children[0].children[3].children[0].rotation.x,
						this.human_clone.children[0].children[3].children[0].rotation.y,
						this.human_clone.children[0].children[3].children[0].rotation.z
					);
					//腰の回転
					this.human.children[1].rotation.set(
						this.human_clone.children[1].rotation.x,
						this.human_clone.children[1].rotation.y,
						this.human_clone.children[1].rotation.z
					);
					//右大腿の回転
					this.human.children[1].children[1].rotation.set(
						this.human_clone.children[1].children[1].rotation.x,
						this.human_clone.children[1].children[1].rotation.y,
						this.human_clone.children[1].children[1].rotation.z
					);
					//右下腿の回転
					this.human.children[1].children[1].children[0].rotation.set(
						this.human_clone.children[1].children[1].children[0].rotation.x,
						this.human_clone.children[1].children[1].children[0].rotation.y,
						this.human_clone.children[1].children[1].children[0].rotation.z
					);
					//左大腿の回転
					this.human.children[1].children[2].rotation.set(
						this.human_clone.children[1].children[2].rotation.x,
						this.human_clone.children[1].children[2].rotation.y,
						this.human_clone.children[1].children[2].rotation.z
					);
					//左下腿の回転
					this.human.children[1].children[2].children[0].rotation.set(
						this.human_clone.children[1].children[2].children[0].rotation.x,
						this.human_clone.children[1].children[2].children[0].rotation.y,
						this.human_clone.children[1].children[2].children[0].rotation.z
					);


					this.controls.update();
					this.renderer.render(this.scene, this.camera);
					//console.log("from FrameSelecte");
					this.reset_flag = true;

					//部位がすでに選ばれていれば、角度バーを更新
					//if(this.selected_parts != 0){
					//	this.rotationX_bar = this.selected_parts.rotation.x;
					//	this.rotationY_bar = this.selected_parts.rotation.y;
					//	this.rotationZ_bar = this.selected_parts.rotation.z;
						//角度バーに反映された直後の値を保持
					//	this.selected_parts_rotX = this.selected_parts.rotation.x;
					//	this.selected_parts_rotY = this.selected_parts.rotation.y;
					//	this.selected_parts_rotZ = this.selected_parts.rotation.z;
					//}else{
					//	this.rotationX_bar = 0;
					//	this.rotationY_bar = 0;
					//	this.rotationZ_bar = 0;
					//};

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
					//最初に実行する処理
					const awaitFunc1 = async() => {
						console.log("makeUpdates");
						//データベース書き込みにかかる時間を測る
						startTime = performance.now();
						//１台のマシンが行なった操作が、他方のマシンに反映されるまでの時間を測る
						console.log("更新ボタンが押された: "+startTime);

					};

					const awaitFunc2 = async() => {
						await awaitFunc1();
						//部位毎のループをまわす
						for(var i=0; i<this.obj_name_list.length; i++){
							//軸ごとのループを回す
							for(var j=0; j<3; j++){

								if(j == 0){
									var rot_name = "x";
								}else if (j == 1) {
									var rot_name = "y";
								}else if (j == 2) {
									var rot_name = "z";
								}

								//bar_valueのチェック
								for(var k=0; k<this.keyframetracks[i*3+j].times.length; k++){

									if(this.bar_value == this.keyframetracks[i*3+j].times[k]){
										//index番号が変数kと等しいvaluesを現在の回転値で更新
										this.keyframetracks[i*3+j].values[k] = this.human.getObjectByName(this.obj_name_list[i]).rotation[rot_name];
										updates[this.obj_name_list[i]+"/"+rot_name+"/values"] = this.keyframetracks[i*3+j].values;
										break;
									}else if(this.bar_value < this.keyframetracks[i*3+j].times[k]){
										//index番号が変数kの位置のtimes,valuesそれぞれにbar_value,現在の回転値を追加
										//それ以後のindex番号を一つずつずらす
										this.keyframetracks[i*3+j].times.splice(k,0,this.bar_value);
										this.keyframetracks[i*3+j].values.splice(k,0,this.human.getObjectByName(this.obj_name_list[i]).rotation[rot_name]);
										updates[this.obj_name_list[i]+"/"+rot_name+"/times"] = this.keyframetracks[i*3+j].times;
										updates[this.obj_name_list[i]+"/"+rot_name+"/values"] = this.keyframetracks[i*3+j].values;
										break;
									}else if(k == this.keyframetracks[i*3+j].times.length - 1){
										//最後尾にtimes,valuesそれぞれbar_value,現在の回転値を末尾に追加
										this.keyframetracks[i*3+j].times.push(this.bar_value);
										this.keyframetracks[i*3+j].values.push(this.human.getObjectByName(this.obj_name_list[i]).rotation[rot_name]);
										updates[this.obj_name_list[i]+"/"+rot_name+"/times"] = this.keyframetracks[i*3+j].times;
										updates[this.obj_name_list[i]+"/"+rot_name+"/values"] = this.keyframetracks[i*3+j].values;
										break;
									};
								}
							}
						}
						//console.log("アニメーションを変更");
						this.reset_flag = true;
					};
					const asyncFunc = async() => {
						await awaitFunc2();
						renewDB(updates);
					};

					asyncFunc().then(() => console.log('Fulfilled')).catch(() => console.log('Rejected'))

					//お試し
					//this.controls.update();
					//this.renderer.render(this.scene, this.camera);


				},
				handleMouseMove:function(e){
					const element = event.currentTarget;
	        const x = event.clientX - element.offsetLeft;
	        const y = event.clientY - element.offsetTop;

	        const w = element.offsetWidth;
	        const h = element.offsetHeight;

	        this.mouse.x = (x/w) * 2 - 1;
	        this.mouse.y = -(y/h) * 2 + 1;
				},
				grapObject:function(e){
					e.preventDefault();
					this.raycaster.setFromCamera(this.mouse, this.camera);
					const intersects = this.raycaster.intersectObjects(this.human.children, true);

					if(intersects.length === 0){
	          console.log('パーツが見つかりませんでした');

	        }else{
	          //回転操作へ
	          this.MeshList.map(mesh => {
	            // 交差しているオブジェクトが1つ以上存在し、
	            // 交差しているオブジェクトの1番目(最前面)のものだったら
	            if (intersects.length > 0 && mesh === intersects[0].object) {
	              console.log("find");
	              flag_sel = 1;
	              asyncProcess(flag_sel).then(
	                responce => {
	                  console.log(responce);
	                  //メッシュ選択(非同期処理1)
	                  if(this.MeshList[0] === mesh){
	                    selected_Pivot = this.PivotList[0];
	                  }else if(this.MeshList[1] === mesh){
	                    selected_Pivot = this.PivotList[1];
	                  }else if(this.MeshList[2] === mesh){
	                    selected_Pivot = this.PivotList[2];
	                  }else if(this.MeshList[3] === mesh){
	                    selected_Pivot = this.PivotList[3];
	                  }else if(this.MeshList[4] === mesh){
	                    selected_Pivot = this.PivotList[4];
	                  }else if(this.MeshList[5] === mesh){
	                    selected_Pivot = this.PivotList[5];
	                  }else if(this.MeshList[6] === mesh){
	                    selected_Pivot = this.PivotList[6];
	                  }else if(this.MeshList[7] === mesh){
	                    selected_Pivot = this.PivotList[7];
	                  }else if(this.MeshList[8] === mesh){
	                    selected_Pivot = this.PivotList[8];
	                  }else if(this.MeshList[9] === mesh){
	                    selected_Pivot = this.PivotList[9];
	                  }else if(this.MeshList[10] === mesh){
	                    selected_Pivot = this.PivotList[10];
	                  }
	                  flag_hol = 1;
	                  return asyncProcess(flag_hol);
	                }
	              ).then(
	                responce => {
	                  console.log('lon,latの設定');
	                  lon = selected_Pivot.rotation.y;
	                  lat = selected_Pivot.rotation.x;
	                  return asyncProcess_q(1);
	                }
	              ).then(
	                responce => {
	                  console.log('lon,latの設定２');
	                  onMouseDownLon = lon;
	                  onMouseDownLat = lat;
	                  return asyncProcess_q(1);
	                }
	              ).then(
	                responce => {
	                  console.log('flag_rotを立てる');
	                  flag_rot = 1;

	                  return asyncProcess(flag_rot)
	                }
	              ).then(
	                response => {
	                  console.log('イベントリスナー等の設定');
	                  if(e.clientX) {
	                    onMouseDownMouseX = e.clientX;
	                    onMouseDownMouseY = e.clientY;
	                  } else if(event.touches) {
	                    onMouseDownMouseX = e.touches[0].clientX
	                    onMouseDownMouseY = e.touches[0].clientY;
	                  } else {
	                    onMouseDownMouseX = e.changedTouches[0].clientX
	                    onMouseDownMouseY = e.changedTouches[0].clientY
	                  }

	                  this.canvas.addEventListener( this.eventmove, this.onDocumentMove, false );
	                  this.canvas.addEventListener( this.eventend, this.onDocumentUp, false );

										this.editingRenderLoop();
	                }
	              ).catch(error => {
									console.log(error.toString());
									this.controls.enabled = false;
								});
	            }
	          });
	        }

				},
				onDocumentMove:function(e){
					e.preventDefault();
	        if(e.clientX) {
	          var touchClientX = e.clientX;
	          var touchClientY = e.clientY;
	        } else if(e.touches) {
	          var touchClientX = e.touches[0].clientX
	          var touchClientY = e.touches[0].clientY;
	        } else {
	          var touchClientX = e.changedTouches[0].clientX
	          var touchClientY = e.changedTouches[0].clientY
	        }
	        lon = ( touchClientX - onMouseDownMouseX ) * 0.01 + onMouseDownLon;
	        lat = ( touchClientY - onMouseDownMouseY ) * 0.01 + onMouseDownLat;


				},
				onDocumentUp:function(e){
					this.canvas.removeEventListener( this.eventmove, this.onDocumentMove, false );
	        this.canvas.removeEventListener( this.eventend, this.onDocumentUp, false );
	        selected_Pivot = 0;
	        flag_hol = 0;
	        flag_sel = 0;
	        flag_rot = 0;
	        console.log('ドロップ');
					this.controls.enabled = false;

				},
				//編集中のレンダリングループ
				editingRenderLoop:function(e){
					//物体を回転させる
	        if(flag_rot == 1){
	          selected_Pivot.rotation.y = lon;
	          selected_Pivot.rotation.x = lat;
	          //console.log('rot');
						//レンダリング
		  			this.renderer.render(this.scene, this.camera);

	        }else{
						//console.log("ループ終了");
						return;
					}
					requestAnimationFrame(this.editingRenderLoop);
				},
				mode_change:function(e){
					if(this.controls.enabled == false){
						this.controls.enabled = true;
						this.canvas.addEventListener(this.eventstart, this.OrbitStart,{passive:false});
						this.canvas.removeEventListener(this.eventmove, this.handleMouseMove);
						this.canvas.removeEventListener(this.eventstart, this.grapObject, false);
						this.button_mes = "現在:視点操作";
					}else if (this.controls.enabled == true) {
						this.controls.enabled = false;
						this.canvas.removeEventListener(this.eventstart, this.OrbitStart,{passive:false});
						this.canvas.addEventListener(this.eventmove, this.handleMouseMove);
						this.canvas.addEventListener(this.eventstart, this.grapObject, false);
						this.button_mes = "現在:物体操作";
					}

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
        body.position.set(0,75,0);
				//体グループ(ピボット管理用)
	      const body_group = new THREE.Group();
				body_group.name = "body";
	      body_group.position.set(0,175,0);
	      body_group.add(body);
        this.human.add(body_group);

        //頭
        const head_geometry = new THREE.SphereGeometry(30,30,30);
        const head = new THREE.Mesh(head_geometry,body_material);
        head.position.set(0,185,0);
        body_group.add(head);

        //右腕
				const arm_material =  new THREE.MeshNormalMaterial();
	      const arm_geometry = new THREE.BoxGeometry(80,15,15);
        const right_arm_1 = new THREE.Mesh( arm_geometry, arm_material );
				right_arm_1.position.set(-40,0,0);
        const right_arm_2 = right_arm_1.clone();
        right_arm_2.position.set(-40,0,0);
				//右腕グループ(ピボット管理用)
	      const right_arm_group = new THREE.Group();
				right_arm_group.name = "right_arm_1";
	      right_arm_group.position.set(-25,130,0);
	      const right_arm_group2 = new THREE.Group();
				right_arm_group2.name = "right_arm_2";
	      right_arm_group2.position.set(-80,0,0);
	      right_arm_group2.add(right_arm_2);
	      right_arm_group.add(right_arm_group2);
	      right_arm_group.add(right_arm_1);
	      body_group.add(right_arm_group);


				//左腕
				const left_arm_1 = new THREE.Mesh( arm_geometry, arm_material );
	      left_arm_1.position.set(40,0,0);
	      //右前腕メッシュ
	      const left_arm_2 = left_arm_1.clone();
	      left_arm_2.position.set(40,0,0);
	      //右腕グループ(ピボット管理用)
	      const left_arm_group = new THREE.Group();
				left_arm_group.name = "left_arm_1";
	      left_arm_group.position.set(25,130,0);
	      const left_arm_group2 = new THREE.Group();
				left_arm_group2.name = "left_arm_2";
	      left_arm_group2.position.set(80,0,0);
	      left_arm_group2.add(left_arm_2);
	      left_arm_group.add(left_arm_group2);
	      left_arm_group.add(left_arm_1);
	      body_group.add(left_arm_group);

        //腰
        const waist_geometry = new THREE.BoxGeometry(50,20,50);
        const waist = new THREE.Mesh(waist_geometry, body_material);
				const waist_group = new THREE.Group();
				waist_group.name = "waist";
				waist_group.position.set(0,170,0);
				waist_group.add(waist);
        this.human.add(waist_group);


        //右足
				const foot_material =  new THREE.MeshNormalMaterial();
	      const foot_geometry = new THREE.BoxGeometry(20,80,20);
	      const right_foot_1 = new THREE.Mesh( foot_geometry, foot_material );
	      right_foot_1.position.set(0,-40,0);
	      const right_foot_2 = right_foot_1.clone();
	      right_foot_2.position.set(0,-40,0);
	      //右足グループ
	      const right_foot_group = new THREE.Group();
				right_foot_group.name = "right_foot_1";
	      right_foot_group.position.set(-25,-10,0);
	      const right_foot_group2 = new THREE.Group();
				right_foot_group2.name = "right_foot_2";
	      right_foot_group2.position.set(0,-80,0);
	      right_foot_group2.add(right_foot_2);
	      right_foot_group.add(right_foot_group2);
	      right_foot_group.add(right_foot_1);
	      waist_group.add(right_foot_group);


				//左足
				const left_foot_1 = new THREE.Mesh( foot_geometry, foot_material );
	      left_foot_1.position.set(0,-40,0);
	      const left_foot_2 = left_foot_1.clone();
	      left_foot_2.position.set(0,-40,0);
	      //右足グループ
	      const left_foot_group = new THREE.Group();
				left_foot_group.name = "left_foot_1";
	      left_foot_group.position.set(25,-10,0);
	      const left_foot_group2 = new THREE.Group();
				left_foot_group2.name = "left_foot_2";
	      left_foot_group2.position.set(0,-80,0);
	      left_foot_group2.add(left_foot_2);
	      left_foot_group.add(left_foot_group2);
	      left_foot_group.add(left_foot_1);
	      waist_group.add(left_foot_group);

				//レイキャスター利用のため、リストに保存
				this.MeshList.push(body);
	      this.MeshList.push(head);
	      this.MeshList.push(waist);
	      this.MeshList.push(right_arm_1);
	      this.MeshList.push(right_arm_2);
	      this.MeshList.push(left_arm_1);
	      this.MeshList.push(left_arm_2);
	      this.MeshList.push(right_foot_1);
	      this.MeshList.push(right_foot_2);
	      this.MeshList.push(left_foot_1);
	      this.MeshList.push(left_foot_2);

				this.PivotList.push(body_group);
				this.PivotList.push(body_group);
				this.PivotList.push(waist_group);
				this.PivotList.push(right_arm_group);
				this.PivotList.push(right_arm_group2);
				this.PivotList.push(left_arm_group);
				this.PivotList.push(left_arm_group2);
				this.PivotList.push(right_foot_group);
				this.PivotList.push(right_foot_group2);
				this.PivotList.push(left_foot_group);
				this.PivotList.push(left_foot_group2);

				//DBの更新用の部位別文字列配列を定義
				this.obj_name_list.push("body");
				this.obj_name_list.push("right_arm_1");
				this.obj_name_list.push("right_arm_2");
				this.obj_name_list.push("left_arm_1");
				this.obj_name_list.push("left_arm_2");
				this.obj_name_list.push("waist");
				this.obj_name_list.push("right_foot_1");
				this.obj_name_list.push("right_foot_2");
				this.obj_name_list.push("left_foot_1");
				this.obj_name_list.push("left_foot_2");



				this.human_clone = this.human.clone();

				//human_cloneは再生時のみaddする, humanを用いて画面上で編集

				this.scene.add(this.human);

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
					//name:".rotation[x]",
					name:"body/right_arm_1.rotation[x]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_RightArm1_y = {
					//name:".rotation[y]",
					name:"body/right_arm_1.rotation[y]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_RightArm1_z = {
					//name:".rotation[z]",
					name:"body/right_arm_1.rotation[z]",
					type:"number",
					times:[0],
					values:[0]
				};

				var rotationKeyframeTrackJSON_RightArm2_x = {
					//name:".children[0].rotation[x]",
					name:"body/right_arm_1/right_arm_2.rotation[x]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_RightArm2_y = {
					//name:".children[0].rotation[y]",
					name:"body/right_arm_1/right_arm_2.rotation[y]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_RightArm2_z = {
					//name:".children[0].rotation[z]",
					name:"body/right_arm_1/right_arm_2.rotation[z]",
					type:"number",
					times:[0],
					values:[0]
				};

				var rotationKeyframeTrackJSON_LeftArm1_x = {
					//name:".rotation[x]",
					name:"body/left_arm_1.rotation[x]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_LeftArm1_y = {
					//name:".rotation[y]",
					name:"body/left_arm_1.rotation[y]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_LeftArm1_z = {
					//name:".rotation[z]",
					name:"body/left_arm_1.rotation[z]",
					type:"number",
					times:[0],
					values:[0]
				};

				var rotationKeyframeTrackJSON_LeftArm2_x = {
					//name:".children[0].rotation[x]",
					name:"body/left_arm_1/left_arm_2.rotation[x]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_LeftArm2_y = {
					//name:".children[0].rotation[y]",
					name:"body/left_arm_1/left_arm_2.rotation[y]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_LeftArm2_z = {
					//name:".children[0].rotation[z]",
					name:"body/left_arm_1/left_arm_2.rotation[z]",
					type:"number",
					times:[0],
					values:[0]
				};

				var rotationKeyframeTrackJSON_Waist_x = {
					//name:".children[1].rotation[x]",
					name:"waist.rotation[x]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_Waist_y = {
					//name:".children[1].rotation[y]",
					name:"waist.rotation[y]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_Waist_z = {
					//name:".children[1].rotation[z]",
					name:"waist.rotation[z]",
					type:"number",
					times:[0],
					values:[0]
				};

				var rotationKeyframeTrackJSON_RightFoot1_x = {
					//name:".rotation[x]",
					name:"waist/right_foot_1.rotation[x]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_RightFoot1_y = {
					//name:".rotation[y]",
					name:"waist/right_foot_1.rotation[y]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_RightFoot1_z = {
					//name:".rotation[z]",
					name:"waist/right_foot_1.rotation[z]",
					type:"number",
					times:[0],
					values:[0]
				};

				var rotationKeyframeTrackJSON_RightFoot2_x = {
					//name:".children[0].rotation[x]",
					name:"waist/right_foot_1/right_foot_2.rotation[x]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_RightFoot2_y = {
					//name:".children[0].rotation[y]",
					name:"waist/right_foot_1/right_foot_2.rotation[y]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_RightFoot2_z = {
					//name:".children[0].rotation[z]",
					name:"waist/right_foot_1/right_foot_2.rotation[z]",
					type:"number",
					times:[0],
					values:[0]
				};

				var rotationKeyframeTrackJSON_LeftFoot1_x = {
					//name:".rotation[x]",
					name:"waist/left_foot_1.rotation[x]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_LeftFoot1_y = {
					//name:".rotation[y]",
					name:"waist/left_foot_1.rotation[y]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_LeftFoot1_z = {
					//name:".rotation[z]",
					name:"waist/left_foot_1.rotation[z]",
					type:"number",
					times:[0],
					values:[0]
				};

				var rotationKeyframeTrackJSON_LeftFoot2_x = {
					//name:".children[0].rotation[x]",
					name:"waist/left_foot_1/left_foot_2.rotation[x]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_LeftFoot2_y = {
					//name:".children[0].rotation[y]",
					name:"waist/left_foot_1/left_foot_2.rotation[y]",
					type:"number",
					times:[0],
					values:[0]
				};
				var rotationKeyframeTrackJSON_LeftFoot2_z = {
					//name:".children[0].rotation[z]",
					name:"waist/left_foot_1/left_foot_2.rotation[z]",
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
						this.keyframetracks[17],
//					]
//				};
//				var clipJSON_RightArm = {
//					duration: 4,
//					name:"right_arm_animation",
//					tracks: [
						this.keyframetracks[3],
						this.keyframetracks[4],
						this.keyframetracks[5],

						this.keyframetracks[6],
						this.keyframetracks[7],
						this.keyframetracks[8],
//					]
//				};
//				var clipJSON_LeftArm = {
//					duration: 4,
//					name:"left_arm_animation",
//					tracks: [
						this.keyframetracks[9],
						this.keyframetracks[10],
						this.keyframetracks[11],

						this.keyframetracks[12],
						this.keyframetracks[13],
						this.keyframetracks[14],
//					]
//				};
//				var clipJSON_RightFoot = {
//					duration: 4,
//					name:"right_foot_animation",
//					tracks: [
						this.keyframetracks[18],
						this.keyframetracks[19],
						this.keyframetracks[20],

						this.keyframetracks[21],
						this.keyframetracks[22],
						this.keyframetracks[23],
//					]
//				};
//				var clipJSON_LeftFoot = {
//					duration: 4,
//					name:"left_foot_animation",
//					tracks: [
						this.keyframetracks[24],
						this.keyframetracks[25],
						this.keyframetracks[26],

						this.keyframetracks[27],
						this.keyframetracks[28],
						this.keyframetracks[29]
					]
				};


				var clip_all = THREE.AnimationClip.parse(clipJSON_Human);
				//var clip_Human = THREE.AnimationClip.parse(clipJSON_Human);
				//var clip_RightArm = THREE.AnimationClip.parse(clipJSON_RightArm);
				//var clip_LeftArm = THREE.AnimationClip.parse(clipJSON_LeftArm);
				//var clip_RightFoot = THREE.AnimationClip.parse(clipJSON_RightFoot);
				//var clip_LeftFoot = THREE.AnimationClip.parse(clipJSON_LeftFoot);
				this.clips.push(clip_all);
				//this.clips.push(clip_Human);
				//this.clips.push(clip_RightArm);
				//this.clips.push(clip_LeftArm);
				//this.clips.push(clip_RightFoot);
				//this.clips.push(clip_LeftFoot);


				var all_mixer = new THREE.AnimationMixer(this.human_clone);
				//var human_mixer = new THREE.AnimationMixer(this.human);
		    //var right_arm_mixer = new THREE.AnimationMixer(this.human.children[0].children[1]);
		    //var left_arm_mixer = new THREE.AnimationMixer(this.human.children[0].children[2]);
		    //var right_foot_mixer = new THREE.AnimationMixer(this.human.children[1].children[0]);
		    //var left_foot_mixer = new THREE.AnimationMixer(this.human.children[1].children[1]);
				this.mixers.push(all_mixer);
				//this.mixers.push(human_mixer);
				//this.mixers.push(right_arm_mixer);
				//this.mixers.push(left_arm_mixer);
				//this.mixers.push(right_foot_mixer);
				//this.mixers.push(left_foot_mixer);


				var all_action = this.mixers[0].clipAction(this.clips[0]);
		    //var human_action = this.mixers[0].clipAction(this.clips[0]);
		    //var right_arm_action = this.mixers[1].clipAction(this.clips[1]);
				//var left_arm_action = this.mixers[2].clipAction(this.clips[2]);
				//var right_foot_action = this.mixers[3].clipAction(this.clips[3]);
				//var left_foot_action = this.mixers[4].clipAction(this.clips[4]);
				this.actions.push(all_action);
				//this.actions.push(human_action);
				//this.actions.push(right_arm_action);
				//this.actions.push(left_arm_action);
				//this.actions.push(right_foot_action);
				//this.actions.push(left_foot_action);

				//ループ設定(１回のみ)
				this.actions[0].setLoop(THREE.LoopOnce);
				//this.actions[1].setLoop(THREE.LoopOnce);
				//this.actions[2].setLoop(THREE.LoopOnce);
				//this.actions[3].setLoop(THREE.LoopOnce);
				//this.actions[4].setLoop(THREE.LoopOnce);
				this.actions[0].play();
				//this.actions[1].play();
				//this.actions[2].play();
				//this.actions[3].play();
				//this.actions[4].play();

				this.controls.update();
        this.renderer.render(this.scene, this.camera);


				this.canvas.addEventListener(this.eventmove, this.handleMouseMove);
				this.canvas.addEventListener(this.eventstart, this.grapObject, false);

				spinner.classList.add('loaded');

      }
    });
  };

	//アニメーションデータの更新処理の計測用
	var updateTime = 0;

  function waitRTDBload(){
    database.ref('/student').on('value',function(snapshot){
      if(!first){
				//Promiseを用いて計測・アラート
				//asyncProcess(1).then(
				//	responce => {
		    //   vm.changed_DB_bySomeone(snapshot);
				//		return asyncProcess_q(1);
				//	}
				//).then(
				//	responce => {
				//		console.log("他方マシン: "+performance.now());
				//		console.log('Databaseが更新されました');
				//	}
				//).catch(error => {
				//	console.log(error.toString());
				//});
				const awaitFunc3 = async() => {
					updateTime = performance.now();
					vm.changed_DB_bySomeone(snapshot);
				};
				const asyncFunc1 = async() => {
					await awaitFunc3();

					//console.log('Database更新: '+ (performance.now()-updateTime));
				};

				asyncFunc1().then(()=>console.log("他方マシン: "+performance.now())).catch(()=>console.log('Rejected'))


      }else{
        createV(snapshot);
        first = false;
      }
    });
  };

  waitRTDBload();
}


 

  //test POUR, NEWKEG, LOW Volume --  swapped rele LOW HIGH to HIGH LOW eve 6/17, inserting Flushing for test on 6/18 aftn
// AK - 06192015

var b=require('bonescript');
var moment=require('moment');
var fs=require('fs');
var sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database("/home/debian/Log.db");




function insert_db(line_id, opcode, parameter, user_id){

	//console.log(' parm='+parameter);
    var stmt = db.prepare("INSERT INTO Log VALUES (NULL,(?),(?),(?),(?),strftime('%s','now'))");
    stmt.run(line_id,opcode,parameter,user_id);
    stmt.finalize();
   
}





var LINE_PUSHES = [6,5,6];         // Dispensing portion in oz for lines 1,2,3
var LINE_NUM = 3;                 // Number of active lines

var filen=['/home/debian/vol_1.txt','/home/debian/vol_2.txt','/home/debian/vol_3.txt'];
var file_success=['success_1.txt','success_2.txt','success_3.txt'];

var keg_vol=[]; // current liquid volume in each line keg oz
for(var i=0;i<LINE_NUM;i++){
    keg_vol[i]=fs.readFileSync(filen[i],'utf8');
}


var p_butt=['P9_12','P9_24','P9_26'];     // butt 1,2,3
var p_led=['P9_15','P9_13','P9_11'];     // led 1,2,3
var b_butt=[];                             // working button current status

// Production
var sensL = ['P9_23','P9_25','P9_27'];    // sensors Left 1,2,3
var sensR =['P8_15','P8_17','P8_26'];     // sensors Right 1,2,3
//var rele_L=['P8_8','P8_10','P8_12'];
//var rele_R=['P8_7','P8_9','P8_11'];     // relays Right


var rele_R=['P8_8','P8_10','P8_12'];   // BROWN VS RED 
var rele_L=['P8_7','P8_9','P8_11'];

var sL=[-1,-1,-1];                        // left sensor initialize
var sR=[-1,-1,-1];

var KEG_VOL_LOW=34;                        // alarm low volume in keg oz


//Constants

var PRESSED=0; 			//button status
var RELEASED=1;
var PISTON_IS_HERE=0
var RIGHT=1;    		 //piston move direction
var LEFT= -1;


// System statuses
var TIMING=12;             // SYSTEM MEASURING button pressed time duration
var ANALYZE=1;             // system ready to make decision based on button press duration
var READY=-1;       
var POUR=6;
var NEWKEG_WAIT_CONFIRM = 7;
var NEWKEG_CONFIRM_PRESSED=9;
var NEWKEG_INITIATED = 8;
var BLOCKED_AFTER_NEWKEG=11;
var FLUSHING_STOP=21;
var FLUSHING_START = 22;
var FLUSHING_INITIATED=20;
var FLUSHING_WAIT_CONFIRM=25;
var FLUSHING_CONFIRM_PRESSED=26;
var FLUSHING_WAIT_STOP=27;
var CONTINUOUS_FLUSH=28;

//  Operation codes
var OPCODE_NORMAL_POUR		=6;
var OPCODE_NEWKEG		=7;
var OPCODE_POUR_FAIL		=-6;
var OPCODE_CLEANING_START	=11;
var OPCODE_CLEANING_END		=19;
var OPCODE_CLEANCYCLE_END	=29;
var OPCODE_SYSTEM_STARTUP	=1;

var USER_ID=0;                    //for future use
var LINE_ID=[1,2,3];

// LED mode
var LIGHT=1;
var DARK=0;
var DBL_BLINK=4;
var SLOW_BLINK=5;
var FAST_BLINK=9;




var FULL_VOLUME=676;          	  // full keg volume oz
var LOW_VOLUME= 34;           	  // LOW VOLUME start slow flashing
var NUM_NEW_KEG_CLICKS=2;      	  // clicks to confirm new keg
var NUM_FLUSHING_CLICKS=3;        // clicks to confirm FLASHING
var FLUSHING_PUSHES_MAX=4;        // 3l FOR PRODUCTION?

var LED_PERIOD_SLOW_FLASH=750         // msec
var LED_PERIOD_FAST_FLASH=350         // msec
var LED_PERIOD_DBL_FLASH = 100        //msec

var POUR_PERIOD=2000                      	//hold button to POUR
var STANDARD_PERIOD = 5000                 	//msec
var STANDARD_PERIOD_EXTENDED = 5100       	//msec
var STANDARD_PERIOD_2 = 10000               	//msec
var STANDARD_PERIOD_EXTENDED_2 = 10100   	//msec
var STANDARD_PERIOD_3 = 15000            	//msec
var STANDARD_PERIOD_EXTENDED_3 = 15100 		//msec
var DURATION_1_PISTON_RUN = 2000         	// max time allocated for one piston run msec
var STANDARD_PERIOD_4 = 20000             	//msec

var DURATION_FLUSH_MODE_MAX = 3600        	//sec

var status=[READY,READY,READY];
var led_status=[LIGHT,LIGHT,LIGHT];
var current_led=[LIGHT,LIGHT,LIGHT];



for (i=0;i<LINE_NUM;i++){ // big init cycle
    b.pinMode(p_butt[i],b.INPUT,7,'pullup','fast',null);
    b.pinMode(p_led[i],b.OUTPUT);
    b.pinMode(sensL[i],b.INPUT,7,'pullup','fast',null);
    b.pinMode(sensR[i],b.INPUT,7,'pullup','fast',null);
    b.pinMode(rele_L[i],b.OUTPUT);
    b.pinMode(rele_R[i],b.OUTPUT);
    b.digitalWrite(rele_L[i],b.LOW);
    b.digitalWrite(rele_R[i],b.LOW);
    }




for (i=0;i<LINE_NUM;i++){ // big init cycle

	console.log('line opcode vol user'+ LINE_ID[i] + ' '+ OPCODE_SYSTEM_STARTUP+ ' '+ keg_vol[i]+ ' '+ USER_ID)
	insert_db(LINE_ID[i],OPCODE_SYSTEM_STARTUP,keg_vol[i],USER_ID);
}

var read_butt=[
function() {read_butt1()},
function() {read_butt2()},
function() {read_butt3()}
];
function read_butt3(){
b.digitalRead(p_butt[2],set_butt3);
}
function set_butt3(x){
b_butt[2]=x.value;
}

function read_butt2(){
b.digitalRead(p_butt[1],set_butt2);
}
function set_butt2(x){
b_butt[1]=x.value;
}
function read_butt1(){
b.digitalRead(p_butt[0],set_butt1);
}
function set_butt1(x){
b_butt[0]=x.value;
}
var read_sensL=[
function() {read_sensL1()},
function() {read_sensL2()},
function() {read_sensL3()}
];
function read_sensL3(){
b.digitalRead(sensL[2],check_sensL3);
}
function check_sensL3(x){
sL[2]=x.value;
}
function read_sensL2(){
b.digitalRead(sensL[1],check_sensL2);
}

function check_sensL2(x){
sL[1]=x.value;
}
function read_sensL1(){
b.digitalRead(sensL[0],check_sensL1);
}
function check_sensL1(x){
sL[0]=x.value;
}
var read_sensR=[
function() {read_sensR1()},
function() {read_sensR2()},
function() {read_sensR3()}
];

function read_sensR3(){
b.digitalRead(sensR[2],check_sensR3);
}
function check_sensR3(x){
sR[2]=x.value;
}
function read_sensR2(){
b.digitalRead(sensR[1],check_sensR2);
}
function check_sensR2(x){
sR[1]=x.value;
}
function read_sensR1(){
b.digitalRead(sensR[0],check_sensR1);
}
function check_sensR1(x){
sR[0]=x.value;
}


//wORKING ARRAYS, variables
var move=[0,0,0];
var finis=[];
var start_led_light=[]; // start led light when blinking
var start_led_dark=[];
var curr_num_blinks=[0,0,0];
var prev_led_status=[];
var start_confirm=[];
var delta_confirm=[];
var delta_pressed=[];
var delta_led=[];
var num_confirm_clicked=[];
var start_pressed=[];
var num_pushes=[];
var start_pour=[];
var delta_pour=[];
var start_flashing_mode=[];





setInterval(loop1,1); // on production make 1 msec!!!

if(i==1)console.log('----------------status='+status[i]);


function loop1(x){
    for (i=0;i<LINE_NUM;i++){

        read_sensL[i]();
        read_sensR[i]();
        read_butt[i]();

        if(status[i]==READY){
            move[i]=RIGHT;
        if(sR[i]===PISTON_IS_HERE)
            move[i]= LEFT;
}







// Time independent jumps
switch ( status[i]) {
   
case READY:   

    if (  keg_vol[i] < LOW_VOLUME  &&  led_status[i] != SLOW_BLINK){ 
        led_status[i]=SLOW_BLINK;
        start_led_light[i]=moment();
        start_led_dark[i]=moment();
    }
    if(led_status[i] == SLOW_BLINK  || led_status[i] == FAST_BLINK) ;  //DO nothing
    else
        led_status[i]=LIGHT;    
    if (b_butt[i] == PRESSED) {
        status[i]=TIMING;
        start_pressed[i]=moment();
    }
break;


case DBL_BLINK:
    led_status[i] = DBL_BLINK;
break;


case FAST_BLINK:
    led_status[i] = FAST_BLINK;
break;


case NEWKEG_INITIATED:
    console.log('newkeg initiated '+i);
    fs.writeFileSync(filen[i],FULL_VOLUME);
    insert_db(LINE_ID[i],OPCODE_NEWKEG,keg_vol[i],USER_ID);
    keg_vol[i]=FULL_VOLUME;
    led_status[i] = DARK;
    status[i]=BLOCKED_AFTER_NEWKEG;
    start_confirm[i]=moment();
break;


case FLUSHING_INITIATED:
	console.log('FLUSHING initiated '+i);
	led_status[i] = SLOW_BLINK;
	current_led[i] == LIGHT;
	start_led_light[i]=moment();
	if (b_butt[i] == PRESSED) {status[i]=FLUSHING_STOP; start_flashing_mode[i]=moment();}
	break;


} //end switch status time independent






finis[i]=moment();

// Time dependent jumps
switch ( status[i]) {


case POUR:
    if(num_pushes[i]>=LINE_PUSHES[i]){                 //success full glass delivered
        keg_vol[i]=keg_vol[i]-num_pushes[i];
        fs.writeFileSync(filen[i],keg_vol[i]);
        status[i]=READY;
        fs.writeFileSync(file_success[i],1);
        b.digitalWrite(rele_L[i],b.LOW);
        b.digitalWrite(rele_R[i],b.LOW);
        insert_db(LINE_ID[i],OPCODE_NORMAL_POUR,num_pushes[i],USER_ID);
    }
    else{
        delta_pour[i]=finis[i].diff(start_pour[i],'milliseconds');
//        console.log('delta_pour='+delta_pour[i]);
        if(delta_pour[i]>DURATION_1_PISTON_RUN){                         //piston stuck
            console.log('piston failure pushes='+num_pushes[i]);
            led_status[i]=FAST_BLINK;
            start_led_light[i]=moment();
            start_led_dark[i]=start_led_light[i];
            keg_vol[i]=keg_vol[i] - num_pushes[i];
            fs.writeFileSync(filen[i],keg_vol[i]);
            status[i]=READY;
            b.digitalWrite(rele_L[i],b.LOW);
            b.digitalWrite(rele_R[i],b.LOW);
			insert_db(LINE_ID[i],OPCODE_POUR_FAIL,num_pushes[i],USER_ID);
        }
        else {                         //need activate another pair of valves?
            if(move[i] == RIGHT) {
		b.digitalWrite(rele_L[i],b.HIGH);
                b.digitalWrite(rele_R[i],b.LOW);                
                if(sR[i]===PISTON_IS_HERE){
                    num_pushes[i]++;
                    move[i]=LEFT;
                    b.digitalWrite(rele_R[i],b.HIGH);
                    b.digitalWrite(rele_L[i],b.LOW);
                    start_pour[i]=moment();
                }
            }
            else
                if (move[i] == LEFT){
//                    console.log('left');
		    b.digitalWrite(rele_R[i],b.HIGH);
                    b.digitalWrite(rele_L[i],b.LOW);
                    if(sL[i]===PISTON_IS_HERE){
                        num_pushes[i]++;
                        b.digitalWrite(rele_L[i],b.HIGH);
                        b.digitalWrite(rele_R[i],b.LOW);
                        move[i]=RIGHT;
                        start_pour[i]=moment();
                    }
                }
        }
    }
break;


case ANALYZE:             //makes decision based on duration of button pressed time after its release
    console.log('analyze');
    delta_pressed[i]=finis[i].diff(start_pressed[i],'milliseconds');
    if(delta_pressed[i]< POUR_PERIOD) {
        status[i]=POUR;
        num_pushes[i]=0;
        start_pour[i]=moment();
        fs.writeFileSync(file_success[i],0);
    }
    else
        if (delta_pressed[i]>= STANDARD_PERIOD && delta_pressed[i] < STANDARD_PERIOD_2){
            status[i]=NEWKEG_WAIT_CONFIRM;
            start_confirm[i]=moment();
            led_status[i]=FAST_BLINK;
            num_confirm_clicked[i]=0;
        }
        else
            if (delta_pressed[i]>= STANDARD_PERIOD_3 && delta_pressed[i] < STANDARD_PERIOD_4){
                status[i]=FLASHING_WAIT_CONFIRM;
                start_confirm[i]=moment();
                led_status[i]=FAST_BLINK;
                num_confirm_clicked[i]=0;
            }
			
			else if (delta_pressed[i]>= STANDARD_PERIOD_3 && delta_pressed[i] < STANDARD_PERIOD_4){
				status[i]=FLUSHING_WAIT_CONFIRM;
				start_confirm[i]=moment();
				led_status[i]=FAST_BLINK;
				num_confirm_clicked[i]=0;
			}			
            else
                status[i]=READY;
break;


case TIMING:     //count duration of the button when it is still pressed
    led_status[i]=DARK;
    delta_pressed[i]=finis[i].diff(start_pressed[i],'milliseconds');
    if(delta_pressed[i]> STANDARD_PERIOD && delta_pressed[i]< STANDARD_PERIOD_EXTENDED ) {
        status[i]=DBL_BLINK;
        curr_num_blinks[i]=0;
        start_led_dark[i]=moment();
        start_led_light[i]=moment();
    }
    if(delta_pressed[i]> STANDARD_PERIOD_2 && delta_pressed[i]< STANDARD_PERIOD_EXTENDED_2 ) {
        status[i]=DBL_BLINK;
        curr_num_blinks[i]=0;
        start_led_dark[i]=moment();
        start_led_light[i]=moment();
    }
    if(delta_pressed[i]> STANDARD_PERIOD_3 && delta_pressed[i]< STANDARD_PERIOD_EXTENDED_3 ) {
        status[i]=FAST_BLINK;
        start_led_dark[i]=moment();
        start_led_light[i]=moment();
    }
    if(delta_pressed[i]> STANDARD_PERIOD_4)
        status[i]=READY;

    if(b_butt[i]==RELEASED)
        status[i]=ANALYZE;
break;


case BLOCKED_AFTER_NEWKEG:
    delta_confirm[i]=finis[i].diff(start_confirm[i],'milliseconds');
    if(delta_confirm[i]> STANDARD_PERIOD )
        status[i]=READY;
break;


case NEWKEG_WAIT_CONFIRM:
    delta_confirm[i]=finis[i].diff(start_confirm[i],'milliseconds');
    if(b_butt[i]==PRESSED){
        status[i]=NEWKEG_CONFIRM_PRESSED;
        if(num_confirm_clicked[i]===0)
            start_confirm[i]=moment();
    }
    if(delta_confirm[i]> STANDARD_PERIOD ) {
        status[i]=READY;
        led_status[i]=LIGHT;
        fs.appendFileSync('log.txt', 's=expired NEWKEG_WAIT_CONFIRM '+i );
    }
break;


case NEWKEG_CONFIRM_PRESSED:
    delta_confirm[i]=finis[i].diff(start_confirm[i],'milliseconds');
    if(b_butt[i]==RELEASED) {
        num_confirm_clicked[i]++;
        status[i]=NEWKEG_WAIT_CONFIRM;
    }
    if(num_confirm_clicked[i] >= NUM_NEW_KEG_CLICKS)
        status[i]=NEWKEG_INITIATED;
    if(delta_confirm[i]> STANDARD_PERIOD ) {
        status[i]=READY;
        led_status[i]=LIGHT;
        fs.appendFileSync('log.txt', 's=expired NEWKEG_WAIT_CONFIRM '+i );
    }
break;

/*
case FLUSHING_STOP:
	b.digitalWrite(rele_L[i],b.LOW);
	b.digitalWrite(rele_R[i],b.LOW);
	led_status=SLOW_FLASH;
	if(b_butt[i]==PRESSED) { 
		status[i]=FLUSHING_START; 
		start_confirm[i]=moment();
	}
	 
break;

case FLUSHING_START:
	if (b_butt[i] == RELEASED) {
		delta_confirm[i]=finis[i].diff(start_confirm[i],'milliseconds');
		if(delta_confirm[i]<STANDARD_PERIOD){
			led_status[i]=DARK;
			status[i]=CONTINUOUS_FLUSH;
			first_pressed[i]=0;
			start_pour[i]=moment();
		}
		else {status[i]=READY;
	}
break;
 
case FLUSHING_WAIT_STOP:
	status[i]=CONTINUOUS_FLASH;
	if(b_butt[i]==RELEASED){
		delta_confirm[i]=finis[i].diff(start_confirm[i],'milliseconds');
		if(delta_confirm[i]<STANDARD_PERIOD){
			led_status[i]=SLOW_FLASH;
			status[i]=FLASHING_STOP;
			 
		}
		else {status[i]=READY; 
		

	}
break;

  

case CONTINUOUS_FLUSH:

if(b_butt[i]==PRESSED ) {
	status[i]=FLUSHING_WAIT_STOP; 
	if (first_pressed[i]==0) {
		first_pressed[i]=1; 
		start_confirm[i]=moment();
	}
}

 
  
delta_pour[i]=finis[i].diff(start_pour[i],'milliseconds');
if(delta_pour[i]>DURATION_1_PISTON_RUN){ //piston stuck
	//console.log('piston failure pushes='+num_pushes[i]);
	led_status[i]=FAST_BLINK;
	status[i]=FLASHING_STOP;
	b.digitalWrite(rele_L[i],b.LOW);
	b.digitalWrite(rele_R[i],b.LOW);
} 
else { //need activate another pair of valves?
	if(move[i] == RIGHT){
		//console.log(' right move sL,sR= '+move[i]+' '+ sL[i]+' ' +sR[i] + ' '+' ' );
		b.digitalWrite(rele_R[i],b.LOW);
		b.digitalWrite(rele_L[i],b.HIGH);
		if(sR[i]===PISTON_IS_HERE){
			num_pushes[i]++;
			b.digitalWrite(rele_L[i],b.LOW);
			move[i]=-move[i];
			b.digitalWrite(rele_R[i],b.HIGH);
			start_pour[i]=moment();
			if(first_pressed[i]=-1 || num_pushes[i] > FLUSHING_PUSHES_MAX) status[i]=FLASHING_STOP;
		}
	}
	else if (move[i] == LEFT){
		//console.log('left');
		b.digitalWrite(rele_L[i],b.LOW);
		b.digitalWrite(rele_R[i],b.HIGH);
		if(sL[i]===PISTON_IS_HERE){
			num_pushes[i]++;
			b.digitalWrite(rele_R[i],b.LOW);
			move[i]=-move[i];
			start_pour[i]=moment();
			if(first_pressed[i]=-1 || num_pushes[i] > FLUSHING_PUSHES_MAX) status[i]=FLASHING_STOP;
		}
	}
}
break;

 

case FLUSHING_WAIT_CONFIRM:
	//console.log('newkeg wait_confirm');
	delta_confirm[i]=finis[i].diff(start_confirm[i],'milliseconds');
	if(b_butt[i]==PRESSED){
		status[i]=FLUSHING_CONFIRM_PRESSED;
		if(num_confirm_clicked[i]===0) start_confirm[i]=moment();
	}
	if(delta_confirm[i]> STANDARD_PERIOD ) {
		status[i]=READY; 
		fs.appendFileSync('log.txt', 's=expired FLASHING_WAIT_CONFIRM '+i );
	}
break;
	
	
case FLUSHING_CONFIRM_PRESSED:
	//console.log('confirm_pressed');
	delta_confirm[i]=finis[i].diff(start_confirm[i],'milliseconds');
	if(b_butt[i]==RELEASED) {
		num_confirm_clicked[i]++; 
		status[i]=FLASHING_WAIT_CONFIRM;
	}
	//if(num_confirm_clicked[i] >= NUM_FLUSHING_CLICKS) status[i]=FLUSHING_INITIATED;
	if(num_confirm_clicked[i] >= NUM_FLASHING_CLICKS) {
	    status[i]=FLUSHING_STOP; 
	    led_status[i]=FAST_FLASH;
	}
	if(delta_confirm[i]> STANDARD_PERIOD ) {
	    status[i]=READY; 
	    fs.appendFileSync('log.txt', 's=expired FLASHING_WAIT_CONFIRM '+i ); 
	}
break;
*/

} //end switch status time dependent





// Dispatcher for LED mode
switch (led_status[i]) {
case LIGHT:
    b.digitalWrite(p_led[i],b.HIGH);
break;

case DARK:
    b.digitalWrite(p_led[i],b.LOW);
break;


case SLOW_BLINK:
    if(current_led[i] == LIGHT){
        delta_led[i]=finis[i].diff(start_led_light[i],'milliseconds');
        if(delta_led[i] > LED_PERIOD_SLOW_FLASH) {
            current_led[i]=DARK;
            start_led_dark[i]=moment();
            b.digitalWrite(p_led[i],b.LOW);
        }
    }
    if(current_led[i] == DARK){
        delta_led[i]=finis[i].diff(start_led_dark[i],'milliseconds');
        if(delta_led[i] > LED_PERIOD_SLOW_FLASH) {
            current_led[i]=LIGHT;
            start_led_light[i]=moment();
            b.digitalWrite(p_led[i],b.HIGH);
        }
    }
break;

case FAST_BLINK:
    if(current_led[i] == LIGHT){
        delta_led[i]=finis[i].diff(start_led_light[i],'milliseconds');
        if(delta_led[i] > LED_PERIOD_FAST_FLASH) {
            current_led[i]=DARK;
            start_led_dark[i]=moment();
            b.digitalWrite(p_led[i],b.LOW);
        }
    }
    if(current_led[i] == DARK){
        delta_led[i]=finis[i].diff(start_led_dark[i],'milliseconds');
        if(delta_led[i] > LED_PERIOD_FAST_FLASH) {
            current_led[i]=LIGHT;
            start_led_light[i]=moment();
            b.digitalWrite(p_led[i],b.HIGH);
        }
    }
break;

case DBL_BLINK:
    finis[i]=moment();
    if(current_led[i] == LIGHT){
        delta_led[i]=finis[i].diff(start_led_light[i],'milliseconds');
        if(delta_led[i] > LED_PERIOD_DBL_FLASH) {
            current_led[i]=DARK;
            start_led_dark[i]=moment();
            start_led_light[i]=moment();
            b.digitalWrite(p_led[i],b.LOW);
            curr_num_blinks[i]++;
            if(curr_num_blinks[i]>=4)      //number of light changes in double click
                status[i]=TIMING;
        }
    }
    if(current_led[i] == DARK){
        delta_led[i]=finis[i].diff(start_led_dark[i],'milliseconds');
        if(delta_led[i] > LED_PERIOD_DBL_FLASH) {
            current_led[i]=LIGHT;
            start_led_light[i]=moment();
            start_led_dark[i]=moment();
            b.digitalWrite(p_led[i],b.HIGH);
            curr_num_blinks[i]++;
            if(curr_num_blinks[i]>=4) {        //number of light changes in double click
                current_led[i]=DARK;
                status[i]=TIMING;
            }
        }
    }
break;

} //end switch



} //END LOOP each line





} // END MAIN LOOP








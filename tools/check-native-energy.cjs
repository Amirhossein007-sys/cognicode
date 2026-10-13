const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../native/CogniCode/App/NativeEnergyPolicy.swift'),'utf8');
const template=source.match(/let script = """([\s\S]*?)"""/)[1];
for(const lowPower of [false,true])for(const thermal of [0,1,2,3])for(const active of [false,true]){
const classes={},events=[];const context={document:{documentElement:{classList:{toggle:(name,value)=>classes[name]=value}}},window:{dispatchEvent:event=>events.push(event)},CustomEvent:function(type,options){this.type=type;this.detail=options.detail;}};
const script=template.replaceAll('\\(lowPower)',String(lowPower)).replaceAll('\\(thermal)',String(thermal)).replaceAll('\\(isActive)',String(active));vm.runInNewContext(script,context);
assert.equal(classes['energy-saving'],lowPower||thermal>=1);assert.equal(classes['app-paused'],!active);assert.equal(events[0].type,'cognicode:energy-change');assert.equal(events[1].detail,active);assert.equal(context.window.__cogniEnergy.thermal,thermal);
}
const container=fs.readFileSync(path.resolve(__dirname,'../native/CogniCode/App/WebView.swift'),'utf8');for(const hook of ['NativeEnergyPolicy.initialScript()','energyPolicy.start(webView: wv)','energyPolicy.publish()','coordinator.energyPolicy.stop()'])assert.ok(container.includes(hook));
assert.ok(source.includes('if !isActive { onInactive?() }'),'Native cancellation must not depend on suspended WebKit');assert.ok(source.includes('onInactive = nil'),'Dispose the lifecycle callback');assert.match(container,/energyPolicy\.start\(webView: wv\) \{ \[weak self\] in\s+self\?\.cancelRequests\(\)/);
console.log('PASS actual Swift-embedded energy script: 16 low-power/thermal/activity cases and initial/load/disposal wiring; Swift compilation is not tested here');

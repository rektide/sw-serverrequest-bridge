const
  NodeWebStreams= require("node-web-streams")

const
  toNodeReadable= NodeWebStreams.toNodeReadable,
  toNodeWritable= NodeWebStreams.toNodeWritable

function NotImplemented(){
	throw new Error("Not Implemented")
}

function PromiseDefer(){
	let resolve, reject
	const promise= new Promise(function(_resolve, _reject){
		resolve= _resolve
		reject= _reject
	})
	return {promise, resolve, reject}
}

/**
 * Build a Node.js style 'request' event from a 'FetchEvent'.
 * https://w3c.github.io/ServiceWorker/#fetch-event-section
 * https://nodejs.org/api/http.html#http_class_http_incomingmessage
 */
function SwServerRequestBridge(fetch){
	const request= toNodeReadable(fetch.request)
	const headers = {}
	const rawHeaders = []
	for(const header of fetch.request.headers){
		rawHeaders.push(header[0], header[1])
		const name= header[0].toLowerCase()
		const newValue= header[1]
		const oldValue= headers[name]
		const value= oldValue? oldValue+","+newValue: newValue
		headers[name]= value
	}
	request.destroy= NotImplemented
	request.headers= headers
	request.httpVersion= "2.0"
	request.httpVersionMajor= 2
	request.httpVersionMinor= 0
	request.method= fetch.request.method
	request.rawHeaders= rawHeaders
	request.rawTrailers= []
	request.setTimeout= NotImplemented
	request.trailers= {}
	request.url= fetch.request.url

	const pipeStream= new TransformStream()
	const fetchResponse= new Response(pipeStream)
	const trailers = new Headers()
	const trailersDefer= PromiseDefer()
	fetchPromise.trailers= trailersDefer.promise

	const response= toNodeWritable(pipeStream.writable)
	response.addTrailers= function(trailers){
		for(let name in trailers){
			const value= trailers[name]
			trailersDefer.append(name, value)
		}
	}
	const _end= response.end
	response.end= function(data, encoding, cb){
		response.headersSent= true
		response.finished= true
		trailersDefer.resolve(trailers)
		const result = _end.call(response, data, encoding, cb)
	}
	response.finished= false
	response.getHeader= function(name){
		return fetchResponse.headers.get(name)
	}
	response.headersSent= false
	response.removeHeader= function(name){
		fetchResponse.headers.delete(name)
	}
	response.sendDate= true
	response.setHeader= function(name, value){
		if(!Array.isArray(value)){
			fetchResponse.headers.set(name, value)
		}else{
			for(let i in value){
				fetchResponse.headers.set(name, value[i])
			}
		}
	}
	response.setTimeout= NotImplemented
	Object.defineProperties({
		"__fetchEvent": {value: fetchEvent},
		"__trailers": {value: trailers},
		statusCode: {
			get: function(){
				return fetchEvent.status
			},
			set: function(value){
				fetchEvent.status= value
			}		
		},
		statusMessage: {
			get: function(){
				return fetchEvent.statusText
			},
			set: function(value){
				fetchEvent.statusText= value
			}
		}
	})
	const _write= response.write
	response.write= function(){
		if(!response.headersSent){
			response.headersSent= true
		}
		return true
	}
	response.writeContinue= function(){
		this.writeHead(100, "Continue")
		this.end()
	}
	response.writeHead= function(statusCode, statusMessage, headers){
		const statusMessageArgType= typeof(statusMessage)
		if(statusMessageArgType === "string"){
			fetchEvent.statusMessage= statusMessage
		}else if(statusMessageArgType === "object"){
			headers= statusMessage
		}
		for(let name in headers){
			const value= headers[name]
			fetchResponse.headers.set(name, value)
		}
		response.headersSent= true
	}
	
	
	return { request, response, fetchResponse }
}

module.exports= SwServerRequestBridge

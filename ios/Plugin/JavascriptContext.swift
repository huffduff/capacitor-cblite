//
//  JavascriptContext.swift
//  Plugin
//
//  Created by Thomas O'Reilly on 9/17/21.
//  Copyright © 2021 Max Lynch. All rights reserved.
//

import Foundation
import JavaScriptCore

// TODO
let callbackWrapper = """
(__db_res__) => {
    try {
        let rows = %@(__db_res__);
        return { rows };
    } catch (error) {
        console.log({ error });
        return { error };
    }
}
"""

// FIXME auto-register useful callbacks like _count, _sum? or custom native methods?

internal class JavascriptContext: JSContext {

    override init() {
        super.init()
        exceptionHandler = { _, exception in
            print(exception!.toString() ?? "unknown exception")
        }
        name = "CBLite:JSContext"
    }

    override init(virtualMachine: JSVirtualMachine!) {
        super.init(virtualMachine: virtualMachine)
    }

    //    override init(jsGlobalContextRef: JSGlobalContextRef) {
    //        super.init(jsGlobalContextRef: jsGlobalContextRef)
    //    }

    internal func registerScript(_ label: String, _ src: String) throws {
        let cb = evaluateScript("const \(label) = \(src);")
        if cb == nil {
            throw CBLiteError.callbackNotRegistered
        }
    }

    internal func queryCallback(_ script: String, _ rows: [Any]) throws -> [Any] {

        let callback = evaluateScript(String(format: callbackWrapper, script))
        if callback == nil || callback!.isUndefined {
            throw CBLiteError.callbackNotRegistered
        }
        let res = callback!.call(withArguments: [rows])
        let parsed = res?.toDictionary() as! [String: Any]
        if parsed["error"] != nil || parsed["rows"] == nil {
            throw CBLiteError.callbackError(parsed["error"]!)
        }
        return parsed["rows"] as! [Any]
    }
}

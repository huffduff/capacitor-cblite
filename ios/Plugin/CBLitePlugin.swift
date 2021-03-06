import Foundation
import Capacitor

let javascript = JavascriptContext()

/**
 * Please read the Capacitor iOS Plugin Development Guide
 * here: https://capacitorjs.com/docs/plugins/ios
 */
@objc(CBLitePlugin)
public class CBLitePlugin: CAPPlugin {
    
    override public func load() {
        initDatabase()
        do {
            // TODO rebuild to support a key to reduce by?
            try javascript.registerScript("mergeKeys", """
function mergeKeys(rows) {
  const key = '_key';
  const out = rows.reduce((acc, row) => {
    const was = acc[row[key]] || {};
    acc[row[key]] = { ...was, ...row };
    return acc;
  }, {});
  return Object.values(out);
}
"""
)
        } catch {
            print("ERROR: problems registering javascript callbacks")
        }
    }
    
    /**
     * dbs holds a dictionary of active database handles
     */
    private var dbs = [String: Database].init(minimumCapacity: 1)

    private func _db(_ call: CAPPluginCall, unregister: Bool = false) throws -> Database {
        let name = call.getString("name", "")
        // print("Looking for database named: \(name)")
        if dbs[name] == nil {
            print("Creating database \(name)")
            dbs[name] = try Database(name)
            print("registering change events: \(name)")
            dbs[name]!.watchChanges { (data: [String: Any]) -> Void in
                print("sending change event: \(data["doc"] ?? "missing")")
                self.notifyListeners("cblite:change", data: data)
            }
        }
        
        return (unregister ? dbs.removeValue(forKey: name) : dbs[name])!
    }
    
//    private func _db(_ call: CAPPluginCall, unregister: Bool = false) throws -> Database {
//        let db = try _db(call)
//        if unregister {
//
//        }
//        return db
//    }

    @objc func open(_ call: CAPPluginCall) {
        do {
            _ = try _db(call)
            // TODO return useful info?
            call.resolve()
        } catch {
            call.reject("Problem opening database '\(call.getString("name", ""))'", nil, error)
        }
    }
    
    @objc func close(_ call: CAPPluginCall) {
        do {
            _ = try _db(call, unregister: true)
            // TODO return useful info?
            call.resolve()
        } catch {
            call.reject("Problem closing database '\(call.getString("name", ""))'", nil, error)
        }
    }

    @objc func sync(_ call: CAPPluginCall) {
        do {
            let db = try _db(call)

            guard let host = call.getString("host"), let sessionID = call.getString("sessionId") else {
                call.reject("host and Session ID required")
                return
            }

            // get high level replication events
            let repl = db.setRemote(host)
            repl.listener = {(data: [String: Any]) -> Void in
                print("repl change", data)
                self.notifyListeners("cblite:repl", data: data)
            }
            repl.startSession(sessionID, initial: true)

            // TODO return useful ino?
            call.resolve()
        } catch {
            call.reject("Problem starting replication", nil, error)
        }
    }

    @objc func updateSessionID(_ call: CAPPluginCall) {
        do {
            let db = try _db(call)

            guard let sessionID = call.getString("sessionId") else {
                call.reject("Session ID required")
                return
            }

            // get high level replication events
            if db.replicator == nil {
                call.reject("Replicator not available")
                return
            }
            db.replicator!.startSession(sessionID)

            // TODO return useful info?
            call.resolve()
        } catch {
            call.reject("Problem starting replication", nil, error)
        }
    }

    @objc func stopSync(_ call: CAPPluginCall) {
        do {
            let db = try _db(call)
            db.replicator?.stop()
            call.resolve()
        } catch {
            call.reject("Problem stopping replication", nil, error)
        }
    }

    @objc func destroy(_ call: CAPPluginCall) {
        do {
            let db = try _db(call, unregister: true)
            try db.delete()
            call.resolve()
        } catch {
            call.reject("Problem deleting database", nil, error)
        }
    }

    @objc func get(_ call: CAPPluginCall) {
        do {
            let db = try _db(call)
            guard let _id = call.getString("_id") else {
                call.reject("_id field required")
                return
            }
            // FIXME redundant with
            let doc = try db.get(_id)
            call.resolve(doc)
        } catch {
            call.reject("Error fetching document", nil, error)
        }
    }

    @objc func put(_ call: CAPPluginCall) {
        do {
            let db = try _db(call)

            guard var data = call.getObject("doc") else {
                call.reject("Document data missing")
                return
            }
            guard let _id = data.removeValue(forKey: "_id") as! String? else {
                call.reject("_id field required")
                return
            }
            let _rev = data.removeValue(forKey: "_rev") as! String?

            let doc = try db.put(_id, _rev: _rev, data: data)
            call.resolve(doc)
        } catch {
            call.reject("Problem saving document", nil, error)
        }
    }

    // FIXME move to CBLite
    @objc func remove(_ call: CAPPluginCall) {
        do {
            let db = try _db(call)

            guard let _id = call.getString("_id"), let _rev = call.getString("_rev") else {
                call.reject("both _id and _rev fields are required")
                return
            }
            try db.remove(_id, _rev: _rev)
            call.resolve()
        } catch {
            call.reject("Problems removing record", nil, error)
        }
    }

    @objc func indexes(_ call: CAPPluginCall) {
        // TODO support deep fields?
        do {
            let db = try _db(call)
            var out: [Any] = []

            for i in db.indexes() {
                out.append(i)
            }
            call.resolve([ "indexes": out ])
        } catch {
            call.reject("Problems getting indexes")
        }
    }

    @objc func createIndex(_ call: CAPPluginCall) {
        // TODO support deep fields?
        do {
            let db = try _db(call)
            guard let index = call.getObject("index") else {
                call.reject("Index request missing or malformed")
                return
            }
            guard let fields = index["fields"] as! [String]? else {
                call.reject("Index request missing or malformed")
                return
            }
            // if no name submitted, generate one from the fields requested
            let name = (index["name"] as? String) ?? "[\(fields.joined(separator: "|"))]"

            let created = try db.createIndex(name, fields: fields)
            call.resolve(["result": created ? "created" : "exists", "name": name])

        } catch {
            call.reject("Problem creating index", nil, error)
        }
    }

    @objc func registerScript(_ call: CAPPluginCall) {
        do {
            guard let label = call.getString("label"), let script = call.getString("script") else {
                call.reject("Problem registering script: values missing.")
                return
            }

            let scriptPath = bridge?.portablePath(fromLocalURL: URL(string: script))

            try javascript.registerScript(label, script)
            call.resolve(["url": scriptPath?.absoluteString ?? ""])
        } catch {
            call.reject("Problem registering script", nil, error)
        }
    }

    @objc func query(_ call: CAPPluginCall) {
        do {
            let db = try _db(call)

            let callback = call.getString("callback")
            
            var rows: [Any]
            let start = CFAbsoluteTimeGetCurrent()

            if let q = call.getObject("query") {
                rows = try db.query(q)
            } else {
                call.reject("Query statement required")
                return
            }

            let totalCount = rows.count

            if callback != nil {
                rows = try javascript.queryCallback(callback!, rows)
            }

            let finalCount = rows.count
            let executionTime = CFAbsoluteTimeGetCurrent() - start

            call.resolve([
                "rows": rows,
                "executionTime": executionTime,
                "totalCount": totalCount,
                "finalCount": finalCount
            ])
        } catch {
            call.reject("Problem executing query", nil, error)
        }
    }
}

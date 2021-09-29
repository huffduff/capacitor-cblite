import XCTest
import CouchbaseLiteSwift

@testable import Plugin

class CBLiteTests: XCTestCase {
    var db: Plugin.Database!
        
    override func setUp() {
        super.setUp()
        do {
            db = try Database("tester")
        } catch {
            fatalError("problem initializing database")
        }
    }

    override func tearDown() {
        do {
            try db?.delete()
        } catch {
            // too late for anything
        }
        db = nil
        super.tearDown()
    }

    func testKeystore() {
        // This is an example of a functional test case for a plugin.
        // Use XCTAssert and related functions to verify your tests produce the correct results.
        let _id = "somedoc"
        
        let doc: [String: String] = ["foo": "bar"]
        
        do {
            var putResult = try db.put(_id, _rev: nil, data: doc)
            XCTAssertEqual(_id, putResult["_id"])
            XCTAssertNotNil(putResult["_rev"])
            
            var _rev = putResult["_rev"]!
            
            putResult = try db.put(_id, _rev: _rev, data: doc)
            XCTAssertEqual(_id, putResult["_id"])
            XCTAssertNotNil(putResult["_rev"])
            XCTAssertNotEqual(_rev, putResult["_rev"])
            
            _rev = putResult["_rev"]!
            
            var getResult = try db.get(_id)
            XCTAssertEqual(_id, getResult["_id"] as! String)
            XCTAssertEqual(_rev, getResult["_rev"] as! String)
            XCTAssertEqual(doc["foo"], getResult["foo"] as? String)
            
            getResult = try db.get(_id, _rev: _rev)
            XCTAssertEqual(_id, getResult["_id"] as! String)
            XCTAssertEqual(_rev, getResult["_rev"] as! String)
            XCTAssertEqual(doc["foo"], getResult["foo"] as? String)
            
            try db.remove(_id, _rev: _rev)
            XCTAssertThrowsError(try db.get(_id))
            
        } catch {
            XCTFail("Failed: \(error)")
        }
    }
}

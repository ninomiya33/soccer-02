import UIKit
import Capacitor
import GoogleSignIn // 追加

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // ... 省略 ...
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // ... 省略 ...
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // ... 省略 ...
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // ... 省略 ...
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // ... 省略 ...
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Google認証用のURLハンドラ
        if GIDSignIn.sharedInstance.handle(url) {
            return true
        }
        // Capacitorのデフォルト処理
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // ... 省略 ...
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}


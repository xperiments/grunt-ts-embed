/**
 * test.ts
 * Created by xperiments on 23/03/15.
 */
///<reference path="typings/ts-embed/ts-embed.d.ts"/>
import Embed = ts.Embed;
class EmbedTest
{
	@embed({src:'resources/app.js', symbol:'appJS', as:Embed.HTMLScriptElement})
	appCode:string;

	@embed({src:'resources/image.png', symbol:'EmbedImage', as:Embed.HTMLImageElement})
	imageData:HTMLImageElement;
}


class EmbedClassText{

}
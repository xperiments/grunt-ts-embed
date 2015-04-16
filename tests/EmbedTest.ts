/**
 * test.ts
 * Created by xperiments on 23/03/15.
 */
///<reference path="typings/ts-embed/ts-embed.d.ts"/>
import embed = tsembed.embed;
import EmbedType = tsembed.EmbedType;
class EmbedTest
{
	@embed({src:'resources/app.js', symbol:'appJS', as:EmbedType.script})
	appCode:string;

	@embed({src:'resources/image.png', symbol:'EmbedImage', as:EmbedType.image})
	imageData:HTMLImageElement;
}

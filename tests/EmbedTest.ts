/**
 * test.ts
 * Created by xperiments on 23/03/15.
 */

import Embed = ts.Embed;
class EmbedTest
{
	@embed({src:'resources/app.js'}) appCode:string;
	@embed({src:'resources/image.png', as:Embed.HTMLImageElement}) imageData:HTMLImageElement;


}